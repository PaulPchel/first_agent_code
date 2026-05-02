"""Stage 1: Read restaurants CSV, filter Parse/Cal rows, download raw files."""

from __future__ import annotations

import csv
import hashlib
import re
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.scripts.pipeline import cache
from app.scripts.pipeline.models import RestaurantEntry, SourceType

PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
YANDEX_DISK_HOSTS = {"docs.yandex.ru", "docs.yandex.com", "docs.360.yandex.ru"}
GDRIVE_HOSTS = {"drive.google.com", "docs.google.com"}

FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
    ),
}
FETCH_TIMEOUT = 30.0


def _slug_from_name(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-zа-яёА-ЯЁ0-9]+", "-", s)
    return s.strip("-")


def classify_url(url: str) -> SourceType:
    parsed = urlparse(url)
    path_lower = parsed.path.lower()
    ext = Path(path_lower).suffix

    if ext in PDF_EXTENSIONS:
        return SourceType.PDF
    if ext in IMAGE_EXTENSIONS:
        return SourceType.IMAGE

    host = parsed.hostname or ""
    if host in YANDEX_DISK_HOSTS or host in GDRIVE_HOSTS:
        return SourceType.PDF

    if any(kw in path_lower for kw in ("kbju", "kbzhu", "calori", "energy", "nutrition")):
        return SourceType.PDF

    return SourceType.HTML


def _safe_filename(entry: RestaurantEntry, ext: str) -> str:
    slug = entry.slug or _slug_from_name(entry.name)
    url_hash = hashlib.md5(entry.url.encode()).hexdigest()[:8]
    return f"{slug}_{url_hash}{ext}"


def _resolve_gdrive_url(url: str) -> str:
    """Convert Google Drive viewer URL to direct download."""
    m = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
    if m:
        file_id = m.group(1)
        return f"https://drive.google.com/uc?export=download&id={file_id}"
    return url


def _resolve_yandex_url(url: str) -> str | None:
    """Try to extract the original file URL from Yandex Disk viewer."""
    parsed = urlparse(url)
    from urllib.parse import parse_qs
    params = parse_qs(parsed.query)
    ya_url = params.get("url", [None])[0]
    if ya_url and "ya-disk-public" in ya_url:
        api_url = "https://cloud-api.yandex.net/v1/disk/public/resources/download"
        try:
            resp = httpx.get(
                api_url,
                params={"public_key": ya_url},
                headers=FETCH_HEADERS,
                timeout=FETCH_TIMEOUT,
            )
            if resp.status_code == 200:
                return resp.json().get("href")
        except httpx.HTTPError:
            pass
    return None


def download_menu(entry: RestaurantEntry) -> Path | None:
    """Download a single menu URL and return the cached file path."""
    source = entry.source_type
    url = entry.url

    if source == SourceType.PDF:
        ext = ".pdf"
    elif source == SourceType.IMAGE:
        ext = Path(urlparse(url).path).suffix or ".jpg"
    else:
        ext = ".html"

    filename = _safe_filename(entry, ext)

    cached = cache.get("raw", filename)
    if cached:
        return cached

    parsed_host = urlparse(url).hostname or ""
    if parsed_host in GDRIVE_HOSTS:
        url = _resolve_gdrive_url(url)
    elif parsed_host in YANDEX_DISK_HOSTS:
        resolved = _resolve_yandex_url(url)
        if resolved:
            url = resolved

    try:
        with httpx.Client(
            headers=FETCH_HEADERS,
            timeout=FETCH_TIMEOUT,
            follow_redirects=True,
        ) as client:
            resp = client.get(url)
            resp.raise_for_status()

            content_type = resp.headers.get("content-type", "")
            if source == SourceType.HTML or "text/html" in content_type:
                if ext != ".html":
                    filename = Path(filename).with_suffix(".html").name
                    entry.source_type = SourceType.HTML
            elif "application/pdf" in content_type and ext != ".pdf":
                filename = Path(filename).with_suffix(".pdf").name
                entry.source_type = SourceType.PDF

            return cache.put_bytes("raw", filename, resp.content)

    except httpx.HTTPError as exc:
        print(f"    FETCH ERROR [{entry.name}]: {exc}")
        return None


def load_csv(csv_path: str | Path) -> list[RestaurantEntry]:
    """Parse the restaurants CSV and return entries where Calories == 'Parse / Cal'."""
    entries: list[RestaurantEntry] = []
    path = Path(csv_path)

    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            calories_col = (row.get("Calories") or "").strip()
            url = (row.get("URL") or "").strip()
            name = (row.get("Name") or "").strip()
            row_num = int(row.get("#", 0))

            if calories_col != "Parse / Cal" or not url:
                continue

            source_type = classify_url(url)
            slug = (row.get("Slug") or "").strip() or _slug_from_name(name)

            entries.append(RestaurantEntry(
                row_number=row_num,
                name=name,
                url=url,
                slug=slug,
                source_type=source_type,
            ))

    return entries


def fetch_all(csv_path: str | Path) -> list[tuple[RestaurantEntry, Path | None]]:
    """Load CSV, classify, download all Parse/Cal menus. Returns (entry, cached_path) pairs."""
    entries = load_csv(csv_path)
    print(f"Found {len(entries)} restaurants with 'Parse / Cal' calories\n")

    results = []
    for i, entry in enumerate(entries, 1):
        print(f"  [{i}/{len(entries)}] {entry.name} ({entry.source_type.value})")
        cached = download_menu(entry)
        status = f"-> {cached.name}" if cached else "-> FAILED"
        print(f"    {status}")
        results.append((entry, cached))

    succeeded = sum(1 for _, p in results if p)
    print(f"\nFetched {succeeded}/{len(entries)} menus")
    return results


if __name__ == "__main__":
    import sys
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "data/restaurants.csv"
    fetch_all(csv_file)
