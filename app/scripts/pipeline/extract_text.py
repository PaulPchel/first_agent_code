"""Stage 2: Extract text from cached raw files (PDF, HTML, or image via OCR)."""

from __future__ import annotations

import base64
import tempfile
from pathlib import Path

import pdfplumber
from openai import OpenAI

from app.scripts.pipeline import cache
from app.scripts.pipeline.config import OPENAI_API_KEY
from app.scripts.pipeline.models import RestaurantEntry, SourceType

MIN_TEXT_LENGTH = 50
MIN_TEXT_PER_PAGE = 20

OCR_PROMPT = """\
Extract ALL text from this restaurant menu image.
Return only the extracted text, preserving structure \
(dish names, prices, descriptions, nutritional info like calories/protein/fat/carbs).
The menu may be in Russian. Keep the original language."""


def _extract_pdf_text(pdf_path: Path) -> str:
    """Try native text extraction from PDF using pdfplumber."""
    pages_text: list[str] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                pages_text.append(text.strip())
    except Exception as exc:
        print(f"    pdfplumber error: {exc}")
        return ""
    return "\n\n".join(t for t in pages_text if t)


def _pdf_pages_to_images(pdf_path: Path) -> list[bytes]:
    """Render PDF pages as PNG bytes for OCR fallback."""
    images: list[bytes] = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(pdf_path))
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            images.append(pix.tobytes("png"))
        doc.close()
    except ImportError:
        try:
            from pdf2image import convert_from_path
            pil_images = convert_from_path(str(pdf_path), dpi=200)
            for img in pil_images:
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                    img.save(tmp.name, format="PNG")
                    images.append(Path(tmp.name).read_bytes())
                    Path(tmp.name).unlink()
        except ImportError:
            print("    WARNING: neither PyMuPDF nor pdf2image available for OCR fallback")
    return images


def _ocr_image_bytes(image_bytes: bytes, client: OpenAI) -> str:
    """Run GPT-4o Vision OCR on a single image."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": OCR_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
            ],
        }],
        max_tokens=4000,
    )
    content = response.choices[0].message.content
    return content.strip() if content else ""


def _ocr_image_file(image_path: Path, client: OpenAI) -> str:
    """OCR a standalone image file."""
    return _ocr_image_bytes(image_path.read_bytes(), client)


def _extract_html_text(html_path: Path) -> str:
    """Extract readable text from HTML.

    Uses a two-pass approach:
    1. lxml-based extraction that grabs all visible text (preserves tabbed/hidden content)
    2. Falls back to trafilatura if pass 1 yields too little
    """
    html = html_path.read_text(encoding="utf-8", errors="replace")

    text = _extract_html_all_text(html)
    if len(text) >= MIN_TEXT_LENGTH:
        return text

    try:
        import trafilatura
        text = trafilatura.extract(html, include_tables=True, include_links=False)
        return text.strip() if text else ""
    except Exception as exc:
        print(f"    trafilatura error: {exc}")
        return ""


def _extract_html_all_text(html: str) -> str:
    """Extract all visible text from HTML, including hidden tabs and sections."""
    import re
    from lxml import etree

    try:
        tree = etree.HTML(html)
    except Exception:
        return ""

    for tag in tree.iter("script", "style", "noscript"):
        tag.getparent().remove(tag)

    raw = etree.tostring(tree, method="text", encoding="unicode")
    lines = [line.strip() for line in raw.splitlines() if line.strip()]
    lines = [l for l in lines if len(l) > 1]

    text = "\n".join(lines)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_text(
    entry: RestaurantEntry,
    raw_path: Path,
    openai_client: OpenAI | None = None,
) -> Path | None:
    """Extract text from a raw file and write to the cache. Returns text file path."""
    text_filename = f"{raw_path.stem}.txt"

    cached = cache.get("text", text_filename)
    if cached and cached.stat().st_size > MIN_TEXT_LENGTH:
        return cached

    text = ""

    if entry.source_type == SourceType.PDF:
        text = _extract_pdf_text(raw_path)
        needs_ocr = len(text.strip()) < MIN_TEXT_LENGTH or _mostly_empty_pages(raw_path, text)

        if needs_ocr:
            print("    PDF text too short, falling back to OCR...")
            if not openai_client:
                print("    WARNING: no OpenAI client, skipping OCR")
                if text:
                    return cache.put_text("text", text_filename, text)
                return None

            page_images = _pdf_pages_to_images(raw_path)
            if page_images:
                ocr_parts = []
                for i, img_bytes in enumerate(page_images):
                    print(f"    OCR page {i + 1}/{len(page_images)}...", end=" ", flush=True)
                    page_text = _ocr_image_bytes(img_bytes, openai_client)
                    print(f"{len(page_text)} chars")
                    ocr_parts.append(page_text)
                text = "\n\n".join(ocr_parts)

    elif entry.source_type == SourceType.HTML:
        text = _extract_html_text(raw_path)

    elif entry.source_type == SourceType.IMAGE:
        if not openai_client:
            print("    WARNING: no OpenAI client, skipping image OCR")
            return None
        text = _ocr_image_file(raw_path, openai_client)

    if not text or len(text.strip()) < MIN_TEXT_LENGTH:
        print(f"    WARNING: extracted text too short ({len(text)} chars)")
        if text:
            return cache.put_text("text", text_filename, text)
        return None

    return cache.put_text("text", text_filename, text)


def _mostly_empty_pages(pdf_path: Path, extracted_text: str) -> bool:
    """Heuristic: if average text per page is very low, it's likely an image-based PDF."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            n_pages = len(pdf.pages)
    except Exception:
        return False
    if n_pages == 0:
        return True
    avg = len(extracted_text) / n_pages
    return avg < MIN_TEXT_PER_PAGE


def extract_all(
    entries_with_paths: list[tuple[RestaurantEntry, Path | None]],
) -> list[tuple[RestaurantEntry, Path | None]]:
    """Run text extraction on all fetched menus."""
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

    results = []
    total = len(entries_with_paths)

    for i, (entry, raw_path) in enumerate(entries_with_paths, 1):
        print(f"  [{i}/{total}] {entry.name} ({entry.source_type.value})")

        if not raw_path:
            print("    skipped (no raw file)")
            results.append((entry, None))
            continue

        text_path = extract_text(entry, raw_path, openai_client)
        if text_path:
            chars = text_path.stat().st_size
            print(f"    -> {text_path.name} ({chars} chars)")
        else:
            print("    -> FAILED")

        results.append((entry, text_path))

    succeeded = sum(1 for _, p in results if p)
    print(f"\nExtracted text for {succeeded}/{total} menus")
    return results
