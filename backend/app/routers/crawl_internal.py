"""
Endpoint nội bộ: crawl service (hoặc admin) gọi sau khi ghi crawl_data để kích hoạt chuẩn hóa nền.
"""

from __future__ import annotations

import os

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services.crawl_background_jobs import schedule_normalize_crawl_urls

router = APIRouter(prefix="/trohub/internal/crawl", tags=["internal-crawl"])

_SECRET = os.getenv("CRAWL_NORMALIZE_WEBHOOK_SECRET", "").strip()


class NormalizeTriggerBody(BaseModel):
    urls: list[str] = Field(default_factory=list)

    @field_validator("urls")
    @classmethod
    def cap_urls(cls, v: list[str]) -> list[str]:
        return v[:500]


@router.post("/trigger-normalize", status_code=202)
async def trigger_normalize_after_crawl(
    body: NormalizeTriggerBody,
    x_crawl_secret: str | None = Header(default=None, alias="X-Crawl-Secret"),
) -> dict[str, object]:
    if _SECRET and (x_crawl_secret or "").strip() != _SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Crawl-Secret")

    urls = [u.strip() for u in body.urls if u and str(u).strip()]
    if not urls:
        return {"accepted": False, "queued": 0, "message": "No urls"}

    schedule_normalize_crawl_urls(urls)
    return {"accepted": True, "queued": len(urls)}
