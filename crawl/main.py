"""
Crawl service HTTP: dữ liệu ghi MySQL (bảng `MYSQL_TABLE`, mặc định `crawl_data`),
sau đó kích hoạt chuẩn hóa nền trên TroHub backend (nếu cấu hình `BACKEND_NORMALIZE_URL`).
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from config import (
    DATABASE_URL_CONFIGURED,
    DEFAULT_CRAWL_MAX_ITEMS,
    LIST_URL,
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PASSWORD,
    MYSQL_PORT,
    MYSQL_TABLE,
    MYSQL_USER,
)
from crawl_db import get_conn
from crawl_service import (
    _address_matches_location,
    _crawl_and_store,
    _expand_room_row_images,
    _normalize_crawled_row,
    _resolve_list_url,
    init_db,
    persist_normalized_rows,
    run_crawl_by_filters_job,
    schedule_notify_backend_normalize,
)
from crawler import crawl_all
from scheduled_crawl import get_scheduled_state, start_scheduled_crawl, stop_scheduled_crawl

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)


class _CrawlMaxItemsMixin(BaseModel):
    """Ép crawl ít nhất DEFAULT_CRAWL_MAX_ITEMS (Swagger hay gửi nhầm max_items=5)."""

    max_items: int = Field(
        default=DEFAULT_CRAWL_MAX_ITEMS,
        ge=1,
        le=500,
        description=f"Số tin crawl tối đa mỗi request (tối thiểu {DEFAULT_CRAWL_MAX_ITEMS}).",
    )

    @field_validator("max_items", mode="before")
    @classmethod
    def enforce_min_max_items(cls, v: object) -> int:
        if v is None or v == "":
            return DEFAULT_CRAWL_MAX_ITEMS
        n = int(v)
        if n < DEFAULT_CRAWL_MAX_ITEMS:
            logger.info(
                "max_items=%s nhỏ hơn mặc định → dùng %s",
                n,
                DEFAULT_CRAWL_MAX_ITEMS,
            )
            return DEFAULT_CRAWL_MAX_ITEMS
        if n > DEFAULT_CRAWL_MAX_ITEMS:
            return DEFAULT_CRAWL_MAX_ITEMS
        return n


class CrawlRequest(_CrawlMaxItemsMixin):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"max_pages": 5, "max_items": DEFAULT_CRAWL_MAX_ITEMS},
        }
    )

    max_pages: int = Field(default=5, ge=1, le=200)
    list_url: str = Field(default=LIST_URL)


class CrawlByFiltersRequest(_CrawlMaxItemsMixin):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "tinh_thanh": "Đà Nẵng",
                "max_pages": 5,
                "max_items": DEFAULT_CRAWL_MAX_ITEMS,
            }
        }
    )

    keyword: Optional[str] = Field(default=None, description="Keyword vị trí (address/title)")
    tinh_thanh: Optional[str] = Field(default=None, description="Ví dụ: Đà Nẵng, Hồ Chí Minh, Hà Nội")
    min_price: Optional[int] = Field(default=None, ge=0)
    max_price: Optional[int] = Field(default=None, ge=0)
    min_area: Optional[float] = Field(default=None, ge=0)
    max_area: Optional[float] = Field(default=None, ge=0)
    amenities: Optional[str] = Field(default=None, description="Danh sách tiện ích, phân tách dấu phẩy")
    room_type: Optional[str] = Field(default=None, description="phong_tro | can_ho | nha_cho_thue")
    max_pages: int = Field(default=5, ge=1, le=200)
    list_url: str = Field(default=LIST_URL)


class CrawlByLocationRequest(_CrawlMaxItemsMixin):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "tinh_thanh": "Đà Nẵng",
                "max_pages": 5,
                "max_items": DEFAULT_CRAWL_MAX_ITEMS,
            }
        }
    )

    xa_phuong: Optional[str] = Field(
        default=None,
        description="Chuỗi phải có trong địa chỉ (ví dụ tên phường, đường). Bỏ trống = không lọc thêm.",
    )
    tinh_thanh: Optional[str] = Field(
        default=None,
        description="Tên tỉnh/thành để ghép URL danh sách (giống /crawl/by-filters), không bắt buộc xuất hiện trong trường address.",
    )
    max_pages: int = Field(default=5, ge=1, le=200)
    list_url: str = Field(default=LIST_URL)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await asyncio.to_thread(init_db)
    start_scheduled_crawl()
    yield
    await stop_scheduled_crawl()


app = FastAPI(
    title="PhongTro123 Crawl Service",
    version="2.0.0",
    description="Crawl theo filter và lưu vào DB, hỗ trợ search/filter.",
    lifespan=lifespan,
)


@app.post("/crawl/preload")
async def crawl_preload(body: CrawlRequest):
    try:
        result = await asyncio.to_thread(_crawl_and_store, body.max_pages, body.max_items, body.list_url)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Crawl failed: {exc}") from exc
    normalized = result.pop("normalized", [])
    urls = [r.get("url", "") for r in normalized if r.get("url")]
    if urls:
        asyncio.create_task(schedule_notify_backend_normalize(urls))
    return {"success": True, **result}


@app.get("/crawl/scheduled/status")
def crawl_scheduled_status():
    """Trạng thái job nền crawl theo users.address (xem log terminal `[SCHEDULED]`)."""
    return {"success": True, **get_scheduled_state()}


@app.post("/crawl/by-filters")
async def crawl_by_filters(body: CrawlByFiltersRequest):
    """
    Crawl → **ghi toàn bộ tin đã crawl vào MySQL** (upsert) → lọc theo tiêu chí cho trường `data` trong response.
    """
    try:
        result = await asyncio.to_thread(
            run_crawl_by_filters_job,
            keyword=body.keyword,
            tinh_thanh=body.tinh_thanh,
            min_price=body.min_price,
            max_price=body.max_price,
            min_area=body.min_area,
            max_area=body.max_area,
            amenities=body.amenities,
            room_type=body.room_type,
            max_pages=body.max_pages,
            max_items=body.max_items,
            list_url=body.list_url,
            notify_backend=False,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Crawl failed: {exc}") from exc

    urls = result.pop("normalized_urls", [])
    filtered_rows = result.pop("filtered_rows", [])
    if urls:
        asyncio.create_task(schedule_notify_backend_normalize(urls))

    return {
        "success": True,
        **result,
        "data": [_expand_room_row_images(r) for r in filtered_rows],
    }


@app.post("/crawl/by-location")
async def crawl_by_location_api(body: CrawlByLocationRequest):
    """
    Crawl theo trang danh sách → **ghi toàn bộ tin đã crawl vào MySQL** → `data` chỉ là các tin có `xa_phuong` trong địa chỉ (nếu có).
    """
    try:
        list_url = _resolve_list_url(body.list_url, body.tinh_thanh)
        crawled = await asyncio.to_thread(crawl_all, body.max_pages, list_url, body.max_items)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Crawl failed: {exc}") from exc

    normalized = [_normalize_crawled_row(row) for row in crawled]
    inserted = await asyncio.to_thread(persist_normalized_rows, normalized)
    urls = [r.get("url", "") for r in normalized if r.get("url")]
    if urls:
        asyncio.create_task(schedule_notify_backend_normalize(urls))

    filtered = [row for row in normalized if _address_matches_location(row, body.xa_phuong)]
    if body.max_items:
        filtered = filtered[: body.max_items]

    return {
        "success": True,
        "source_url": list_url,
        "crawled_count": len(crawled),
        "matched_count": len(filtered),
        "saved": inserted,
        "data": [_expand_room_row_images(r) for r in filtered],
    }


@app.get("/trohub/crawl/db-status")
def crawl_db_status():
    """Kiểm tra kết nối MySQL và số dòng trong bảng crawl (cùng DB mà service đang ghi)."""
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) AS n FROM `{MYSQL_TABLE}`")
                row = cur.fetchone()
                n = row["n"] if isinstance(row, dict) else row[0]
        return {
            "ok": True,
            "mysql_host": MYSQL_HOST,
            "mysql_port": MYSQL_PORT,
            "mysql_user": MYSQL_USER,
            "mysql_database": MYSQL_DATABASE,
            "mysql_table": MYSQL_TABLE,
            "row_count": int(n),
            "database_url_configured": DATABASE_URL_CONFIGURED,
        }
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


@app.get("/rooms")
def search_rooms(
    keyword: Optional[str] = Query(default=None, description="Keyword vị trí (address/title)"),
    min_price: Optional[int] = Query(default=None, ge=0),
    max_price: Optional[int] = Query(default=None, ge=0),
    min_area: Optional[float] = Query(default=None, ge=0),
    max_area: Optional[float] = Query(default=None, ge=0),
    amenities: Optional[str] = Query(default=None, description="Danh sách tiện ích, phân tách dấu phẩy"),
    room_type: Optional[str] = Query(default=None, description="phong_tro | can_ho | nha_cho_thue"),
    limit: int = Query(default=DEFAULT_CRAWL_MAX_ITEMS, ge=1, le=200),
):
    query = f"SELECT * FROM `{MYSQL_TABLE}` WHERE 1=1"
    args: list[object] = []

    if keyword:
        query += " AND (title LIKE %s OR address LIKE %s)"
        k = f"%{keyword}%"
        args.extend([k, k])
    if min_price is not None:
        query += " AND price >= %s"
        args.append(min_price)
    if max_price is not None:
        query += " AND price <= %s"
        args.append(max_price)
    if min_area is not None:
        query += " AND area >= %s"
        args.append(min_area)
    if max_area is not None:
        query += " AND area <= %s"
        args.append(max_area)
    if room_type:
        query += " AND room_type = %s"
        args.append(room_type)
    if amenities:
        for item in [x.strip() for x in amenities.split(",") if x.strip()]:
            query += " AND amenities LIKE %s"
            args.append(f"%{item}%")

    query += " ORDER BY posted_date DESC LIMIT %s"
    args.append(limit)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, args)
            rows = cur.fetchall()

    return [_expand_room_row_images(r) for r in rows]


@app.get("/rooms/raw-json")
def rooms_raw_json(limit: int = Query(default=DEFAULT_CRAWL_MAX_ITEMS, ge=1, le=500)):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM `{MYSQL_TABLE}` ORDER BY posted_date DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
    expanded = [_expand_room_row_images(r) for r in rows]
    return json.loads(json.dumps(expanded, ensure_ascii=False))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8002, reload=True)
