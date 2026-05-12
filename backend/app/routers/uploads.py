from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.services.minio_storage import storage, upload_image

router = APIRouter(prefix="/trohub/uploads", tags=["uploads"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("/image", status_code=status.HTTP_201_CREATED)
async def upload_image_file(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: jpeg, png, webp, gif.",
        )

    try:
        result = upload_image(file_obj=file.file, filename=file.filename or "image.jpg", content_type=file.content_type)
        return {"message": "Upload successful", **result}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/health")
def upload_health():
    """Kiểm tra nhanh kết nối MinIO và trạng thái bucket — tiện debug khi ảnh không hiển thị."""
    info: dict = {
        "bucket": storage.bucket_name,
        "endpoint": storage.public_endpoint,
        "secure": storage.secure,
        "auto_public": storage.auto_public,
    }
    try:
        storage.ensure_bucket()
        info["status"] = "ok"
        info["bucket_exists"] = True
    except Exception as exc:
        info["status"] = "error"
        info["error"] = str(exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=info)
    return info
