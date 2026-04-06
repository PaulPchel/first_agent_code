"""Download menu photos from S3, OCR them, embed with OpenAI, store in ChromaDB."""

import os
import re
import sys
import tempfile

import boto3
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image
from pillow_heif import register_heif_opener

import pytesseract

load_dotenv()

register_heif_opener()

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
IMAGE_EXTENSIONS = {".heic", ".png", ".jpg", ".jpeg"}
MIN_TEXT_LENGTH = 20


def parse_filename(key: str) -> dict:
    """Extract restaurant and image_id from `{restaurant}_img{id}.ext`."""
    basename = os.path.splitext(os.path.basename(key))[0]
    match = re.match(r"^(.+?)_img(\d+)$", basename, re.IGNORECASE)
    if match:
        return {"restaurant": match.group(1), "image_id": match.group(2)}
    return {"restaurant": basename, "image_id": "0"}


def download_images_from_s3(bucket: str, prefix: str, dest: str) -> list[dict]:
    """List and download image objects from S3. Returns list of {local_path, s3_key}."""
    s3 = boto3.client("s3")
    paginator = s3.get_paginator("list_objects_v2")
    items = []

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            ext = os.path.splitext(key)[1].lower()
            if ext not in IMAGE_EXTENSIONS:
                continue
            local_path = os.path.join(dest, os.path.basename(key))
            s3.download_file(bucket, key, local_path)
            items.append({"local_path": local_path, "s3_key": key})

    return items


def ocr_image(path: str) -> str:
    """Open an image (HEIC/PNG/JPG) and extract text via Tesseract."""
    img = Image.open(path)
    if img.mode != "RGB":
        img = img.convert("RGB")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img.save(tmp.name, format="PNG")
        text = pytesseract.image_to_string(tmp.name)
        os.unlink(tmp.name)

    return text.strip()


def embed_texts(client: OpenAI, texts: list[str]) -> list[list[float]]:
    """Batch-embed a list of texts with OpenAI."""
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


def build() -> None:
    bucket = os.getenv("S3_BUCKET")
    prefix = os.getenv("S3_PREFIX", "menu-photos/")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not bucket:
        print("Error: set S3_BUCKET in .env")
        sys.exit(1)
    if not openai_key:
        print("Error: set OPENAI_API_KEY in .env")
        sys.exit(1)

    openai_client = OpenAI(api_key=openai_key)

    chroma_client = chromadb.PersistentClient(path=os.path.abspath(CHROMA_PATH))
    collection = chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        print(f"Downloading images from s3://{bucket}/{prefix} ...")
        items = download_images_from_s3(bucket, prefix, tmpdir)
        print(f"Downloaded {len(items)} images\n")

        if not items:
            print("No images found. Check bucket/prefix.")
            return

        ids, documents, metadatas, texts_to_embed = [], [], [], []

        for item in items:
            meta = parse_filename(item["s3_key"])
            text = ocr_image(item["local_path"])

            if len(text) < MIN_TEXT_LENGTH:
                print(f"  WARNING low OCR text ({len(text)} chars): {item['s3_key']}")

            doc_id = f"{meta['restaurant']}_{meta['image_id']}"
            print(f"  {item['s3_key']}  ->  {len(text)} chars  [{meta['restaurant']}]")

            ids.append(doc_id)
            documents.append(text)
            metadatas.append({
                "restaurant": meta["restaurant"],
                "image_id": meta["image_id"],
                "s3_key": item["s3_key"],
            })
            texts_to_embed.append(text if text else "(empty)")

        print(f"\nEmbedding {len(texts_to_embed)} texts with {EMBEDDING_MODEL} ...")
        batch_size = 50
        all_embeddings = []
        for i in range(0, len(texts_to_embed), batch_size):
            batch = texts_to_embed[i : i + batch_size]
            all_embeddings.extend(embed_texts(openai_client, batch))

        print("Upserting into ChromaDB ...")
        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=all_embeddings,
        )

        print(f"\nDone. Collection '{COLLECTION_NAME}' now has {collection.count()} documents.")


if __name__ == "__main__":
    build()
