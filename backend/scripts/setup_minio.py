"""Đảm bảo bucket MinIO tồn tại và được set public-read để FE hiển thị ảnh trực tiếp.

Chạy 1 lần sau khi bạn cấu hình `MINIO_*` trong backend/.env:

    cd backend
    python scripts/setup_minio.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.minio_storage import storage


def main() -> None:
    print(f"[minio] endpoint  = {storage.client._base_url}")  # noqa: SLF001
    print(f"[minio] bucket    = {storage.bucket_name}")
    print(f"[minio] public_ep = {storage.public_endpoint}")
    print(f"[minio] secure    = {storage.secure}")
    print(f"[minio] auto_pub  = {storage.auto_public}")
    try:
        storage.ensure_bucket()
    except Exception as exc:
        raise SystemExit(f"[minio] FAILED to ensure bucket: {exc}") from exc
    print(f"[minio] OK — bucket '{storage.bucket_name}' sẵn sàng nhận ảnh.")
    print(
        "[minio] Thử truy cập một object đã upload qua URL:"
        f" http{'s' if storage.secure else ''}://{storage.public_endpoint}/{storage.bucket_name}/<object_name>"
    )


if __name__ == "__main__":
    main()
