"""Tiện ích geocoding cho frontend.

- Reverse geocoding: lat/lng → địa chỉ dạng văn bản (dùng cho nút "Lấy vị trí hiện tại").
"""
from fastapi import APIRouter, HTTPException, Query, status

from app.services.geocoding_service import reverse_geocode

router = APIRouter(prefix="/trohub/geocoding", tags=["geocoding"])


@router.get("/reverse")
def reverse(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    """Tra cứu địa chỉ từ tọa độ. Trả 404 nếu không xác định được."""
    result = reverse_geocode(str(lat), str(lng))
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không xác định được địa chỉ cho toạ độ này.",
        )
    return result
