"""Download menu photos from S3, extract text via GPT-4o Vision, structure into dish rows, store in SQLite."""

import base64
import json
import os
import re
import sys
import tempfile
import uuid

import boto3
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image
from pillow_heif import register_heif_opener

load_dotenv()

register_heif_opener()

IMAGE_EXTENSIONS = {".heic", ".png", ".jpg", ".jpeg"}

OCR_PROMPT = """\
Extract ALL text from this restaurant menu photo.
Return only the extracted text, preserving the structure \
(dish names, prices, descriptions, nutritional info).
The menu may be in Russian."""

STRUCTURE_PROMPT = """\
You are given raw text extracted from a restaurant menu photo.
Parse it into a JSON array of dishes. Each element should have these fields (use null if not present):
- dish_name (string, required)
- description (string or null)
- price (number or null)
- calories (number or null)
- protein (number or null, grams)
- fat (number or null, grams)
- carbs (number or null, grams)

Keep dish names in their original language.
If a line is clearly a section header (e.g. "ОВОЩИ", "НАПИТКИ") and not a dish, skip it.
Return ONLY a valid JSON object with key "dishes" containing the array."""


def parse_filename(key: str) -> dict:
    """Extract restaurant name from `{restaurant}_img{id}.ext`."""
    basename = os.path.splitext(os.path.basename(key))[0]
    match = re.match(r"^(.+?)_img(\d+)$", basename, re.IGNORECASE)
    if match:
        return {"restaurant": match.group(1)}
    return {"restaurant": basename}


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


def extract_text_from_image(path: str, client: OpenAI) -> str:
    """Step 1: OCR — extract raw text from a menu photo using GPT-4o Vision."""
    img = Image.open(path)
    if img.mode != "RGB":
        img = img.convert("RGB")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img.save(tmp.name, format="PNG")
        with open(tmp.name, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        os.unlink(tmp.name)

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


def structure_dishes(raw_text: str, client: OpenAI) -> list[dict]:
    """Step 2: parse raw menu text into a list of structured dish dicts."""
    if not raw_text or len(raw_text) < 10:
        return []

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": STRUCTURE_PROMPT},
            {"role": "user", "content": raw_text},
        ],
        response_format={"type": "json_object"},
        max_tokens=4000,
    )

    content = response.choices[0].message.content
    if not content:
        return []

    try:
        parsed = json.loads(content.strip())
    except json.JSONDecodeError:
        print(f"\n  WARNING: could not parse JSON: {content[:200]}")
        return []

    if isinstance(parsed, dict):
        for value in parsed.values():
            if isinstance(value, list):
                return value
        return []

    return parsed


def build() -> None:
    from app.db.database import SessionLocal, engine
    from app.db.base import Base
    from app.db.models import Dish

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

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    current_run = str(uuid.uuid4())

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            print(f"Run {current_run}\n")
            print(f"Downloading images from s3://{bucket}/{prefix} ...")
            images = download_images_from_s3(bucket, prefix, tmpdir)
            print(f"Downloaded {len(images)} images\n")

            if not images:
                print("No images found. Check bucket/prefix.")
                return

            total_dishes = 0

            for item in images:
                meta = parse_filename(item["s3_key"])
                restaurant = meta["restaurant"]

                print(f"  {item['s3_key']}  [{restaurant}]")

                print(f"    step 1: OCR ... ", end="", flush=True)
                raw_text = extract_text_from_image(item["local_path"], openai_client)
                print(f"{len(raw_text)} chars")

                print(f"    step 2: structure ... ", end="", flush=True)
                dishes = structure_dishes(raw_text, openai_client)
                print(f"{len(dishes)} dishes")

                for d in dishes:
                    dish_name = d.get("dish_name")
                    if not dish_name:
                        continue

                    db.add(Dish(
                        restaurant=restaurant,
                        dish_name=dish_name,
                        description=d.get("description"),
                        price=d.get("price"),
                        calories=d.get("calories"),
                        protein=d.get("protein"),
                        fat=d.get("fat"),
                        carbs=d.get("carbs"),
                        s3_key=item["s3_key"],
                        run_id=current_run,
                    ))
                    total_dishes += 1

                db.commit()

            removed = db.query(Dish).filter(Dish.run_id != current_run).delete()
            db.commit()

            print(f"\nDone. Inserted {total_dishes} dish rows, removed {removed} old rows.")
            print(f"Total dishes in DB: {db.query(Dish).count()}")
    finally:
        db.close()


if __name__ == "__main__":
    build()
