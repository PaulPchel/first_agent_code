"""Upload local menu photos to S3, skipping .mov files."""

import argparse
import os
import sys

import boto3
from dotenv import load_dotenv

load_dotenv()

ALLOWED_EXTENSIONS = {".heic", ".png", ".jpg", ".jpeg"}
SKIP_EXTENSIONS = {".mov"}


def upload_folder(folder_path: str, bucket: str, prefix: str) -> None:
    s3 = boto3.client("s3")

    if not os.path.isdir(folder_path):
        print(f"Error: '{folder_path}' is not a directory")
        sys.exit(1)

    uploaded = 0
    skipped = 0

    for filename in sorted(os.listdir(folder_path)):
        ext = os.path.splitext(filename)[1].lower()

        if ext in SKIP_EXTENSIONS:
            print(f"  skip  {filename} (video)")
            skipped += 1
            continue

        if ext not in ALLOWED_EXTENSIONS:
            print(f"  skip  {filename} (unsupported extension)")
            skipped += 1
            continue

        local_path = os.path.join(folder_path, filename)
        if not os.path.isfile(local_path):
            continue

        s3_key = f"{prefix}{filename}" if prefix else filename
        print(f"  upload {filename} -> s3://{bucket}/{s3_key}")
        s3.upload_file(local_path, bucket, s3_key)
        uploaded += 1

    print(f"\nDone. Uploaded: {uploaded}, Skipped: {skipped}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload menu photos to S3")
    parser.add_argument("folder", help="Local folder containing photos")
    parser.add_argument("--bucket", default=os.getenv("S3_BUCKET"), help="S3 bucket name (or set S3_BUCKET env var)")
    parser.add_argument("--prefix", default=os.getenv("S3_PREFIX", "menu-photos/"), help="S3 key prefix")
    args = parser.parse_args()

    if not args.bucket:
        print("Error: provide --bucket or set S3_BUCKET in .env")
        sys.exit(1)

    print(f"Uploading from '{args.folder}' to s3://{args.bucket}/{args.prefix}")
    upload_folder(args.folder, args.bucket, args.prefix)


if __name__ == "__main__":
    main()
