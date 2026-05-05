"""Pydantic schemas for room API responses and query params."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class RoomRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Khóa chính bản ghi crawl_history.")
    title: str = Field(description="Tiêu đề tin / phòng.")
    price: Decimal | None = Field(default=None, description="Giá (nếu parse được).")
    location: str | None = Field(default=None, description="Khu vực / địa chỉ ngắn.")
    image: str | None = Field(default=None, description="URL ảnh đại diện.")
    description: str | None = Field(default=None, description="Mô tả chi tiết.")
    phone_number: str | None = Field(default=None, description="Số liên hệ nếu có.")
    created_at: datetime = Field(description="Thời điểm lưu bản ghi (server).")
