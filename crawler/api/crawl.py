"""REST route to trigger crawling."""

from typing import Annotated

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from api.deps import get_db
from api.schemas.crawl import CrawlRequest, CrawlResponse
from api.schemas.error import ErrorResponse
from services import crawl_service

router = APIRouter(tags=["crawl"])

_CRAWL_BODY_EXAMPLES = {
    "demo_html": {
        "summary": "HTML demo (không gọi mạng)",
        "description": "Parse sẵn HTML mẫu trong code — phù hợp test nhanh.",
        "value": {"use_demo_html": True},
    },
    "live_url": {
        "summary": "Crawl một URL",
        "value": {
            "url": "https://example.com/phong-tro",
            "use_demo_html": False,
        },
    },
    "env_default": {
        "summary": "Chỉ dùng DEFAULT_CRAWL_URL (.env)",
        "description": "Cần đặt DEFAULT_CRAWL_URL trong .env; body chỉ cần tắt demo.",
        "value": {"use_demo_html": False},
    },
}


@router.post(
    "/crawl",
    response_model=CrawlResponse,
    summary="Chạy crawl",
    description=(
        "Tải HTML (hoặc dùng bản demo), chọn các phần tử theo `ROOM_*_SELECTOR` trong cấu hình, "
        "tạo bản ghi `crawl_history` và trả về số lượng parse cùng danh sách id mới."
    ),
    responses={
        502: {
            "model": ErrorResponse,
            "description": "Lỗi tải trang / parse / upstream (CrawlError).",
        },
    },
)
def trigger_crawl(
    body: Annotated[CrawlRequest, Body(openapi_examples=_CRAWL_BODY_EXAMPLES)],
    db: Session = Depends(get_db),
) -> CrawlResponse:
    url_str = str(body.url) if body.url else None
    result = crawl_service.run_crawl(
        db,
        url=url_str,
        use_demo_html=body.use_demo_html,
    )
    return CrawlResponse.model_validate(result)
