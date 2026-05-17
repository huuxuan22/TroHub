"""
Lớp truy cập MySQL cho crawl: tạo bảng staging và upsert `crawl_data`.
Tách khỏi HTTP và logic crawl HTML.
"""

from __future__ import annotations

import logging

import pymysql

from config import (
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PASSWORD,
    MYSQL_PORT,
    MYSQL_TABLE,
    MYSQL_USER,
)

logger = logging.getLogger(__name__)


def get_conn():
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


def _ensure_coordinate_columns(cur, tbl: str) -> None:
    cur.execute(
        """
        SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = 'latitude'
        """,
        (MYSQL_DATABASE, tbl),
    )
    row = cur.fetchone()
    n = row["n"] if isinstance(row, dict) else row[0]
    if int(n) == 0:
        cur.execute(
            f"""
            ALTER TABLE `{tbl}`
            ADD COLUMN latitude DOUBLE NULL,
            ADD COLUMN longitude DOUBLE NULL
            """
        )
        logger.info("Đã thêm cột latitude/longitude vào %s", tbl)


def init_crawl_table() -> None:
    tbl = MYSQL_TABLE
    with get_conn() as conn:
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
                posted_date VARCHAR(100),
                latitude DOUBLE NULL,
                longitude DOUBLE NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
            )
            _ensure_coordinate_columns(cur, tbl)


def save_crawl_rows(rows: list[dict], *, url_pk_max_len: int) -> int:
    """
    Upsert từng dòng đã chuẩn hóa vào MYSQL_TABLE.
    Trả về số dòng đã chạy INSERT/UPDATE (kể cả ON DUPLICATE không đổi dữ liệu).
    """
    persisted = 0
    tbl = MYSQL_TABLE
    with get_conn() as conn:
        with conn.cursor() as cur:
            for row in rows:
                title = row.get("title", "")
                description = row.get("description", "")
                url = (row.get("url") or "")[:url_pk_max_len]
                if len(row.get("url") or "") > url_pk_max_len:
                    logger.warning(
                        "URL dài hơn %s ký tự, đã cắt cho khớp PK: %s…",
                        url_pk_max_len,
                        url[:80],
                    )
                lat = row.get("latitude")
                lng = row.get("longitude")
                lat_db = float(lat) if lat is not None and lat != "" else None
                lng_db = float(lng) if lng is not None and lng != "" else None

                data = (
                    url,
                    title,
                    row.get("address", ""),
                    int(row.get("price", 0) or 0),
                    float(row.get("area", 0) or 0),
                    str(row.get("room_type", "") or ""),
                    str(row.get("amenities", "") or ""),
                    row.get("phone", ""),
                    description,
                    row.get("images", ""),
                    row.get("posted_date", ""),
                    lat_db,
                    lng_db,
                )
                cur.execute(
                    f"""
                    INSERT INTO `{tbl}`
                    (url, title, address, price, area, room_type, amenities, phone, description,
                     images, posted_date, latitude, longitude)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                        posted_date = VALUES(posted_date),
                        latitude = VALUES(latitude),
                        longitude = VALUES(longitude)
                    """,
                    data,
                )
                persisted += 1
    if rows:
        logger.info("Đã ghi %s/%s dòng vào %s.%s", persisted, len(rows), MYSQL_DATABASE, tbl)
    return persisted
