from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

from fastapi import HTTPException

from app.core.config import (
    STORAGE_LOCAL_DIR,
    STORAGE_PROVIDER,
    STORAGE_PUBLIC_BASE_URL,
    STORAGE_S3_ACCESS_KEY,
    STORAGE_S3_BUCKET,
    STORAGE_S3_ENDPOINT,
    STORAGE_S3_PRESIGNED_EXPIRY,
    STORAGE_S3_PUBLIC_URL_BASE,
    STORAGE_S3_REGION,
    STORAGE_S3_SECRET_KEY,
)


def _store_local(key: str, payload: bytes) -> Dict[str, Optional[str]]:
    target = STORAGE_LOCAL_DIR / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)
    public_base = STORAGE_PUBLIC_BASE_URL.rstrip("/")
    return {
        "provider": "local",
        "bucket": None,
        "key": key,
        "url": f"{public_base}/api/v1/quotes/files/{key}",
    }


def _store_s3(key: str, payload: bytes, content_type: str) -> Dict[str, Optional[str]]:
    try:
        import boto3
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"boto3 is required for S3 storage: {error}") from error

    if not STORAGE_S3_BUCKET:
        raise HTTPException(status_code=500, detail="STORAGE_S3_BUCKET is required for S3/R2 storage.")

    kwargs = {}
    if STORAGE_S3_ENDPOINT:
        kwargs["endpoint_url"] = STORAGE_S3_ENDPOINT
    if STORAGE_S3_ACCESS_KEY:
        kwargs["aws_access_key_id"] = STORAGE_S3_ACCESS_KEY
    if STORAGE_S3_SECRET_KEY:
        kwargs["aws_secret_access_key"] = STORAGE_S3_SECRET_KEY
    if STORAGE_S3_REGION:
        kwargs["region_name"] = STORAGE_S3_REGION

    client = boto3.client("s3", **kwargs)
    client.put_object(
        Bucket=STORAGE_S3_BUCKET,
        Key=key,
        Body=payload,
        ContentType=content_type,
    )

    if STORAGE_S3_PUBLIC_URL_BASE:
        url = f"{STORAGE_S3_PUBLIC_URL_BASE.rstrip('/')}/{key}"
    else:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": STORAGE_S3_BUCKET, "Key": key},
            ExpiresIn=STORAGE_S3_PRESIGNED_EXPIRY,
        )

    return {
        "provider": "s3",
        "bucket": STORAGE_S3_BUCKET,
        "key": key,
        "url": url,
    }


def store_binary(key: str, payload: bytes, content_type: str = "application/pdf") -> Dict[str, Optional[str]]:
    provider = STORAGE_PROVIDER or "local"
    if provider == "local":
        return _store_local(key, payload)
    if provider in {"s3", "r2"}:
        return _store_s3(key, payload, content_type)
    raise HTTPException(status_code=500, detail=f"Unsupported STORAGE_PROVIDER: {provider}")


def read_local_binary(key: str) -> bytes:
    target = STORAGE_LOCAL_DIR / key
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    return target.read_bytes()
