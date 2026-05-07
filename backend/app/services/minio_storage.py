import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error

load_dotenv()


class MinioStorage:
    def __init__(self) -> None:
        endpoint = os.getenv("MINIO_ENDPOINT")
        access_key = os.getenv("MINIO_ACCESS_KEY")
        secret_key = os.getenv("MINIO_SECRET_KEY")
        secure = os.getenv("MINIO_SECURE", "false").lower() == "true"

        if not endpoint or not access_key or not secret_key:
            raise ValueError("MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY must be set.")

        self.bucket_name = os.getenv("MINIO_BUCKET", "trohub")
        self.public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", endpoint)
        self.secure = secure

        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )

    def ensure_bucket(self) -> None:
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)

    def upload_file_object(self, file_obj, filename: str, content_type: str | None) -> dict:
        self.ensure_bucket()

        ext = Path(filename).suffix.lower()
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
        return {"object_name": object_name, "url": file_url}


storage = MinioStorage()


def upload_image(file_obj, filename: str, content_type: str | None) -> dict:
    try:
        return storage.upload_file_object(file_obj=file_obj, filename=filename, content_type=content_type)
    except S3Error as exc:
        raise RuntimeError(f"MinIO upload failed: {exc.code}") from exc
