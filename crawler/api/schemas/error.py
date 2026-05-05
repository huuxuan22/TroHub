"""Shared error body returned by ``AppError`` handlers (non-validation)."""

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str = Field(description="Thông báo lỗi hiển thị cho client.")
    code: str = Field(description="Mã lỗi ổn định, ví dụ: not_found, crawl_failed.")
