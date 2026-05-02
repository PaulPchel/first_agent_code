"""Unified cache layer: S3-first with local mirror.

When S3_BUCKET is set (default), S3 is the source of truth. Files are
downloaded to a local mirror on read and uploaded on write. When S3_BUCKET
is not set (or --local-only is used), falls back to local-only mode.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

_S3_BUCKET = os.getenv("S3_BUCKET", "")
_S3_PREFIX = "parsed-import/"

_ROOT_DIR = Path(__file__).resolve().parents[3]
_CACHE_DIR = _ROOT_DIR / "data" / "cache"

_local_only = False


def set_local_only(value: bool) -> None:
    global _local_only
    _local_only = value


def _use_s3() -> bool:
    return bool(_S3_BUCKET) and not _local_only


def _s3():
    return boto3.client("s3")


def _s3_key(subdir: str, filename: str) -> str:
    return f"{_S3_PREFIX}{subdir}/{filename}"


def _local_dir(subdir: str) -> Path:
    d = _CACHE_DIR / subdir
    d.mkdir(parents=True, exist_ok=True)
    return d


def _local_path(subdir: str, filename: str) -> Path:
    return _local_dir(subdir) / filename


def get(subdir: str, filename: str) -> Path | None:
    """Retrieve a cached file. Checks local mirror first, then S3.

    Returns local path if found, None otherwise.
    """
    local = _local_path(subdir, filename)

    if local.exists() and local.stat().st_size > 0:
        return local

    if not _use_s3():
        return None

    key = _s3_key(subdir, filename)
    try:
        local.parent.mkdir(parents=True, exist_ok=True)
        _s3().download_file(_S3_BUCKET, key, str(local))
        return local
    except ClientError:
        return None


def put(subdir: str, local_file: Path) -> Path:
    """Store a file in the cache. Writes to S3 and keeps local copy.

    Returns the local path.
    """
    dest = _local_path(subdir, local_file.name)

    if dest != local_file:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(local_file, dest)

    if _use_s3() and dest.stat().st_size > 0:
        key = _s3_key(subdir, dest.name)
        try:
            _s3().upload_file(str(dest), _S3_BUCKET, key)
        except ClientError as exc:
            print(f"    S3 upload error: {exc}")

    return dest


def put_bytes(subdir: str, filename: str, data: bytes) -> Path:
    """Write raw bytes to cache. Returns local path."""
    local = _local_path(subdir, filename)
    local.parent.mkdir(parents=True, exist_ok=True)
    local.write_bytes(data)

    if _use_s3() and len(data) > 0:
        key = _s3_key(subdir, filename)
        try:
            _s3().upload_file(str(local), _S3_BUCKET, key)
        except ClientError as exc:
            print(f"    S3 upload error: {exc}")

    return local


def put_text(subdir: str, filename: str, text: str) -> Path:
    """Write text to cache. Returns local path."""
    return put_bytes(subdir, filename, text.encode("utf-8"))


def exists(subdir: str, filename: str) -> bool:
    """Check if a file exists in cache (local or S3)."""
    local = _local_path(subdir, filename)
    if local.exists() and local.stat().st_size > 0:
        return True

    if not _use_s3():
        return False

    key = _s3_key(subdir, filename)
    try:
        _s3().head_object(Bucket=_S3_BUCKET, Key=key)
        return True
    except ClientError:
        return False


def local_path_for(subdir: str, filename: str) -> Path:
    """Get the local mirror path for a file (may not exist yet)."""
    return _local_path(subdir, filename)


def clean_local() -> None:
    """Remove the entire local cache directory."""
    if _CACHE_DIR.exists():
        shutil.rmtree(_CACHE_DIR)
        print(f"  Cleaned local cache: {_CACHE_DIR}")
