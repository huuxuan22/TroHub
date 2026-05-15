"""
Crawl service: dữ liệu chỉ được ghi vào **MySQL** (bảng `MYSQL_TABLE`, mặc định `craw_data`),
xem biến môi trường trong `crawl/.env`. Không dùng SQLite / file `*.db`.
"""
import asyncio
import json
import logging
import re
import unicodedata
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
import pymysql
from pydantic import BaseModel, Field

from config import (
    DATABASE_URL_CONFIGURED,
    LIST_URL,
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PASSWORD,
    MYSQL_PORT,
    MYSQL_TABLE,
    MYSQL_USER,
)
from crawler import crawl_all

logger = logging.getLogger(__name__)

# Khớp độ dài cột `url` PRIMARY KEY trong _init_db (utf8mb4 / giới hạn index InnoDB)
_URL_PK_MAX_LEN = 767

class CrawlRequest(BaseModel):
    max_pages: int = Field(default=5, ge=1, le=200)
    max_items: int = Field(default=5, ge=1, le=500)
    list_url: str = Field(default=LIST_URL)


class CrawlByFiltersRequest(BaseModel):
    keyword: Optional[str] = Field(default=None, description="Keyword vị trí (address/title)")
    tinh_thanh: Optional[str] = Field(default=None, description="Ví dụ: Đà Nẵng, Hồ Chí Minh, Hà Nội")
    min_price: Optional[int] = Field(default=None, ge=0)
    max_price: Optional[int] = Field(default=None, ge=0)
    min_area: Optional[float] = Field(default=None, ge=0)
    max_area: Optional[float] = Field(default=None, ge=0)
    amenities: Optional[str] = Field(default=None, description="Danh sách tiện ích, phân tách dấu phẩy")
    room_type: Optional[str] = Field(default=None, description="phong_tro | can_ho | nha_cho_thue")
    max_pages: int = Field(default=5, ge=1, le=200)
    max_items: int = Field(default=5, ge=1, le=500)
    list_url: str = Field(default=LIST_URL)


class CrawlByLocationRequest(BaseModel):
    xa_phuong: Optional[str] = Field(
        default=None,
        description="Chuỗi phải có trong địa chỉ (ví dụ tên phường, đường). Bỏ trống = không lọc thêm.",
    )
    tinh_thanh: Optional[str] = Field(
        default=None,
        description="Tên tỉnh/thành để ghép URL danh sách (giống /crawl/by-filters), không bắt buộc xuất hiện trong trường address.",
    )
    max_pages: int = Field(default=5, ge=1, le=200)
    max_items: int = Field(default=20, ge=1, le=500)
    list_url: str = Field(default=LIST_URL)


def _normalize_crawled_row(row: dict) -> dict:
    """Chuẩn hóa một tin sau crawl (dùng chung trước khi INSERT)."""
    title = row.get("title", "")
    description = row.get("description", "")
    return {
        "url": row.get("url", ""),
        "title": title,
        "address": row.get("address", ""),
        "price": _parse_price_to_int(row.get("price", "")),
        "area": _parse_area_to_float(row.get("area", "")),
        "room_type": _extract_room_type(title, description),
        "amenities": _extract_amenities(description),
        "phone": row.get("phone", ""),
        "description": description,
        "images": _serialize_images_for_db(row.get("images")),
        "posted_date": row.get("posted_date", ""),
    }


def _address_matches_location(row: dict, xa_phuong: str | None) -> bool:
    if not xa_phuong or not xa_phuong.strip():
        return True
    addr = str(row.get("address", "")).lower()
    return xa_phuong.strip().lower() in addr


def _get_conn():
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def _extract_room_type(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    if "nhà nguyên căn" in text or "biet thu" in text:
        return "nha_cho_thue"
    if "căn hộ" in text or "can ho" in text or "studio" in text:
        return "can_ho"
    return "phong_tro"


def _extract_amenities(description: str) -> str:
    text = description.lower()
    tags = []
    mapping = {
        "wifi": ["wifi", "internet"],
        "may_lanh": ["máy lạnh", "dieu hoa", "điều hòa"],
        "noi_that": ["nội thất", "full đồ", "day du noi that"],
        "gara": ["gara", "để xe", "giu xe"],
        "wc_rieng": ["wc riêng", "toilet riêng", "ve sinh rieng"],
    }
    for key, keywords in mapping.items():
        if any(k in text for k in keywords):
            tags.append(key)
    return ",".join(tags)


def _parse_price_to_int(raw: str) -> int:
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    return int(digits) if digits else 0


def _parse_area_to_float(raw: str) -> float:
    cleaned = str(raw).lower().replace("m²", "").replace("m2", "").strip()
    cleaned = cleaned.replace(",", ".")
    num = ""
    for ch in cleaned:
        if ch.isdigit() or ch == ".":
            num += ch
    try:
        return float(num) if num else 0.0
    except ValueError:
        return 0.0


def _ensure_https_photo_url(u: str) -> str:
    u = (u or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http://") or u.startswith("https://"):
        return u
    return "https://" + u.lstrip("/")


def _parse_images_field_to_list(raw: object) -> list[str]:
    """Đọc cột images: JSON array (mới), hoặc chuỗi nối bằng | (cũ), hoặc một URL đơn."""
    if raw is None:
        return []
    if isinstance(raw, (list, tuple)):
        candidates = [str(x).strip() for x in raw if str(x).strip()]
    else:
        s = str(raw).strip()
        if not s:
            return []
        if s.startswith("["):
            try:
                data = json.loads(s)
            except json.JSONDecodeError:
                data = []
            candidates = [str(x).strip() for x in data] if isinstance(data, list) else []
        elif "|" in s:
            candidates = [x.strip() for x in s.split("|") if x.strip()]
        else:
            candidates = [s]
    return [_ensure_https_photo_url(u) for u in candidates if u]


def _serialize_images_for_db(raw: object) -> str:
    urls = _parse_images_field_to_list(raw)
    return json.dumps(urls, ensure_ascii=False) if urls else ""


def _expand_room_row_images(row: dict) -> dict:
    """Thêm `image_urls` (list) để client không dùng nhầm cả chuỗi `images` làm một href."""
    r = dict(row)
    r["image_urls"] = _parse_images_field_to_list(r.get("images"))
    return r


def _init_db() -> None:
    # Phải trùng tên bảng với MYSQL_TABLE / INSERT (trước đây hardcode craw_data dễ lệch cấu hình).
    tbl = MYSQL_TABLE
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
            CREATE TABLE IF NOT EXISTS `{tbl}` (
                url VARCHAR(767) PRIMARY KEY,
                title VARCHAR(1024) NOT NULL,
                address TEXT,
                price BIGINT DEFAULT 0,
                area DOUBLE DEFAULT 0,
                room_type VARCHAR(100),
                amenities TEXT,
                phone VARCHAR(100),
                description TEXT,
                images TEXT,
                posted_date VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
            )


def _save_rooms(rows: list[dict]) -> int:
    """
    Ghi từng dòng vào MySQL. Trả về số dòng đã chạy INSERT/UPDATE thành công.

    Lưu ý: với ``ON DUPLICATE KEY UPDATE``, MySQL có thể trả ``rowcount == 0``
    khi dữ liệu trùng và không đổi — không được dùng rowcount để đếm vì sẽ báo
    ``saved: 0`` dù bản ghi vẫn nằm trong DB.
    """
    persisted = 0
    with _get_conn() as conn:
        with conn.cursor() as cur:
            for row in rows:
                title = row.get("title", "")
                description = row.get("description", "")
                url = (row.get("url") or "")[:_URL_PK_MAX_LEN]
                if len(row.get("url") or "") > _URL_PK_MAX_LEN:
                    logger.warning("URL dài hơn %s ký tự, đã cắt cho khớp PK: %s…", _URL_PK_MAX_LEN, url[:80])
                data = (
                    url,
                    title,
                    row.get("address", ""),
                    _parse_price_to_int(row.get("price", "")),
                    _parse_area_to_float(row.get("area", "")),
                    _extract_room_type(title, description),
                    _extract_amenities(description),
                    row.get("phone", ""),
                    description,
                    row.get("images", ""),
                    row.get("posted_date", ""),
                )
                cur.execute(
                    f"""
                    INSERT INTO `{MYSQL_TABLE}`
                    (url, title, address, price, area, room_type, amenities, phone, description, images, posted_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        address = VALUES(address),
                        price = VALUES(price),
                        area = VALUES(area),
                        room_type = VALUES(room_type),
                        amenities = VALUES(amenities),
                        phone = VALUES(phone),
                        description = VALUES(description),
                        images = VALUES(images),
                        posted_date = VALUES(posted_date)
                    """,
                    data,
                )
                persisted += 1
    if rows:
        logger.info("Đã ghi %s/%s dòng vào %s.%s", persisted, len(rows), MYSQL_DATABASE, MYSQL_TABLE)
    return persisted


def _crawl_and_store(max_pages: int, max_items: int, list_url: str) -> dict:
    rows = crawl_all(max_pages=max_pages, max_items=max_items, list_url=list_url)
    if not rows:
        logger.warning("Crawl không thu được tin nào — kiểm tra log crawler / parser.")
    normalized = [_normalize_crawled_row(r) for r in rows]
    inserted = _save_rooms(normalized)
    return {"count": len(rows), "saved": inserted}


def _slugify_location(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    no_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    no_marks = no_marks.replace("đ", "d").replace("Đ", "D").lower().strip()
    return re.sub(r"[^a-z0-9]+", "-", no_marks).strip("-")


def _resolve_list_url(list_url: str, tinh_thanh: str | None) -> str:
    if not tinh_thanh:
        return list_url
    return f"https://phongtro123.com/tinh-thanh/{_slugify_location(tinh_thanh)}"


def _match_amenities(room_amenities: str, requested: str | None) -> bool:
    if not requested:
        return True
    room_tokens = {x.strip().lower() for x in str(room_amenities or "").split(",") if x.strip()}
    req_tokens = [x.strip().lower() for x in requested.split(",") if x.strip()]
    return all(token in room_tokens for token in req_tokens)


def _row_matches_filters(row: dict, body: CrawlByFiltersRequest) -> bool:
    title = str(row.get("title", ""))
    address = str(row.get("address", ""))
    keyword_hay = f"{title} {address}".lower()
    if body.keyword and body.keyword.strip().lower() not in keyword_hay:
        return False

    price = int(row.get("price", 0))
    area = float(row.get("area", 0))
    # min_* = 0 nghĩa là “không giới hạn dưới” (hoặc client gửi 0 thay vì null)
    if body.min_price is not None and body.min_price > 0 and price < body.min_price:
        return False
    # max_* = 0 từ Swagger/form thường là “chưa nhập”, không phải “chỉ lấy giá 0 đồng”
    if body.max_price is not None and body.max_price > 0 and price > body.max_price:
        return False
    if body.min_area is not None and body.min_area > 0 and area < body.min_area:
        return False
    if body.max_area is not None and body.max_area > 0 and area > body.max_area:
        return False
    if body.room_type and str(row.get("room_type", "")).lower() != body.room_type.lower():
        return False
    if not _match_amenities(str(row.get("amenities", "")), body.amenities):
        return False
    return True


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _init_db()
    yield


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
    return {"success": True, **result}


@app.post("/crawl/by-filters")
async def crawl_by_filters(body: CrawlByFiltersRequest):
    """
    Crawl → **ghi toàn bộ tin đã crawl vào MySQL** (upsert) → lọc theo tiêu chí cho trường `data` trong response.
    """
    try:
        list_url = _resolve_list_url(body.list_url, body.tinh_thanh)
        crawled = await asyncio.to_thread(crawl_all, body.max_pages, list_url, body.max_items)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Crawl failed: {exc}") from exc

    normalized = [_normalize_crawled_row(row) for row in crawled]

    inserted = _save_rooms(normalized)

    filtered = [row for row in normalized if _row_matches_filters(row, body)]
    if body.max_items:
        filtered = filtered[: body.max_items]

    if crawled and not filtered:
        logger.warning(
            "Crawl được %s tin nhưng filter loại hết (keyword/giá/diện tích/loại phòng/tiện ích). "
            "Toàn bộ tin đã crawl vẫn đã được lưu DB. Kiểm tra max_price/max_area trong request.",
            len(crawled),
        )

    return {
        "success": True,
        "source_url": list_url,
        "crawled_count": len(crawled),
        "matched_count": len(filtered),
        "saved": inserted,
        "data": [_expand_room_row_images(r) for r in filtered],
    }


@app.post("/crawl/by-location")
async def crawl_by_location_api(body: CrawlByLocationRequest):
    """
    Crawl theo trang danh sách → **ghi toàn bộ tin đã crawl vào MySQL** → `data` chỉ là các tin có `xa_phuong` trong địa chỉ (nếu có).
    `tinh_thanh` chỉ dùng để ghép URL (cùng logic `/crawl/by-filters`).
    """
    try:
        list_url = _resolve_list_url(body.list_url, body.tinh_thanh)
        crawled = await asyncio.to_thread(crawl_all, body.max_pages, list_url, body.max_items)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Crawl failed: {exc}") from exc

    normalized = [_normalize_crawled_row(row) for row in crawled]
    inserted = _save_rooms(normalized)

    filtered = [
        row
        for row in normalized
        if _address_matches_location(row, body.xa_phuong)
    ]
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
        with _get_conn() as conn:
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
    limit: int = Query(default=5, ge=1, le=200),
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

    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, args)
            rows = cur.fetchall()

    return [_expand_room_row_images(r) for r in rows]


@app.get("/rooms/raw-json")
def rooms_raw_json(limit: int = Query(default=5, ge=1, le=500)):
    with _get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM `{MYSQL_TABLE}` ORDER BY posted_date DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
    expanded = [_expand_room_row_images(r) for r in rows]
    return json.loads(json.dumps(expanded, ensure_ascii=False))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8002, reload=True)