"""Quản lý lưu trữ ảnh phòng trọ bằng MinIO (S3-compatible).

Hành vi mặc định:
- Tự tạo bucket nếu chưa tồn tại.
- Tự set chính sách public-read cho object (khi `MINIO_AUTO_PUBLIC=true`),
  để FE hiển thị ảnh trực tiếp qua thẻ <img> mà không cần presigned URL.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error

load_dotenv()

_log = logging.getLogger("trohub.minio")


def _is_truthy(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _public_read_policy(bucket_name: str) -> dict:
    """Cho phép GetObject ẩn danh — cần thiết để FE load ảnh trực tiếp."""
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket_name}/*"],
            }
        ],
    }


class MinioStorage:
    def __init__(self) -> None:
        endpoint = os.getenv("MINIO_ENDPOINT")
        access_key = os.getenv("MINIO_ACCESS_KEY")
        secret_key = os.getenv("MINIO_SECRET_KEY")
        secure = _is_truthy(os.getenv("MINIO_SECURE"), default=False)

        if not endpoint or not access_key or not secret_key:
            raise ValueError("MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY must be set.")

        self.bucket_name = os.getenv("MINIO_BUCKET", "anh")
        self.public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", endpoint)
        self.secure = secure
        self.auto_public = _is_truthy(os.getenv("MINIO_AUTO_PUBLIC"), default=True)
        self._bucket_ready = False

        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )

    def _apply_public_policy(self) -> None:
        """Đặt policy public-read cho bucket. Bỏ qua an toàn nếu MinIO không cho set."""
        try:
            self.client.set_bucket_policy(self.bucket_name, json.dumps(_public_read_policy(self.bucket_name)))
            _log.info("MinIO: bucket '%s' đã ở chế độ public-read.", self.bucket_name)
        except S3Error as exc:
            _log.warning(
                "MinIO: không set được public policy cho bucket '%s' (%s). "
                "Hãy cấp quyền 'public read' thủ công trong console nếu muốn FE load ảnh trực tiếp.",
                self.bucket_name,
                exc.code,
            )

    def ensure_bucket(self) -> None:
        """Tạo bucket nếu chưa có; chỉ set policy 1 lần / vòng đời tiến trình."""
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)
            _log.info("MinIO: đã tạo bucket '%s'.", self.bucket_name)
        if not self._bucket_ready:
            if self.auto_public:
                self._apply_public_policy()
            self._bucket_ready = True

    def upload_file_object(self, file_obj, filename: str, content_type: str | None) -> dict:
        self.ensure_bucket()

        ext = Path(filename).suffix.lower() or ".bin"
        object_name = f"images/{uuid.uuid4().hex}{ext}"

        file_obj.seek(0, os.SEEK_END)
        size = file_obj.tell()
        file_obj.seek(0)

        if size == 0:
            raise ValueError("Empty file is not allowed.")

        self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=file_obj,
            length=size,
            content_type=content_type or "application/octet-stream",
        )

        scheme = "https" if self.secure else "http"
        file_url = f"{scheme}://{self.public_endpoint}/{self.bucket_name}/{object_name}"
        return {"object_name": object_name, "url": file_url, "size": size}

    def delete_object(self, object_name: str) -> None:
        try:
            self.client.remove_object(self.bucket_name, object_name)
        except S3Error as exc:
            _log.warning("MinIO: xoá '%s' thất bại: %s", object_name, exc.code)


storage = MinioStorage()


def upload_image(file_obj, filename: str, content_type: str | None) -> dict:
    try:
        return storage.upload_file_object(file_obj=file_obj, filename=filename, content_type=content_type)
    except S3Error as exc:
        raise RuntimeError(f"MinIO upload failed: {exc.code}") from exc
