"""Request/response models for the crawl endpoint."""

from pydantic import BaseModel, Field, HttpUrl


class CrawlRequest(BaseModel):
    """Trigger a crawl run."""

    url: HttpUrl | None = Field(
        default=None,
        description="Trang cần tải. Bỏ trống thì dùng DEFAULT_CRAWL_URL trong .env (nếu có).",
    )
    use_demo_html: bool = Field(
        default=False,
        description="True: không gọi HTTP, parse HTML demo tích hợp (tiện test local).",
    )


class CrawlResponse(BaseModel):
    source_url: str = Field(description="URL đã crawl hoặc chuỗi đánh dấu demo.")
    parsed_count: int = Field(description="Số block phòng đã parse được từ HTML.")
    inserted_ids: list[int] = Field(description="Id các bản ghi crawl_history vừa lưu.")
