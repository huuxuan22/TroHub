"""Đọc địa chỉ người dùng từ bảng `users` (cùng MySQL với backend)."""

from __future__ import annotations

import re
import unicodedata

from crawl_db import get_conn

# (chuỗi tìm trong địa chỉ đã chuẩn hóa, tên tinh/thành cho URL phongtro123)
_CITY_HINTS: list[tuple[str, str]] = [
    ("ho chi minh", "Hồ Chí Minh"),
    ("tp hcm", "Hồ Chí Minh"),
    ("tphcm", "Hồ Chí Minh"),
    ("sai gon", "Hồ Chí Minh"),
    ("ha noi", "Hà Nội"),
    ("hanoi", "Hà Nội"),
    ("da nang", "Đà Nẵng"),
    ("danang", "Đà Nẵng"),
    ("hai phong", "Hải Phòng"),
    ("can tho", "Cần Thơ"),
    ("hue", "Huế"),
    ("thua thien hue", "Huế"),
    ("nha trang", "Nha Trang"),
    ("khanh hoa", "Khánh Hòa"),
    ("binh duong", "Bình Dương"),
    ("dong nai", "Đồng Nai"),
    ("thu duc", "Thủ Đức"),
    ("vung tau", "Vũng Tàu"),
    ("ba ria vung tau", "Vũng Tàu"),
]


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "")
    no_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    no_marks = no_marks.replace("đ", "d").replace("Đ", "D").lower()
    return re.sub(r"\s+", " ", no_marks).strip()


def extract_tinh_thanh(address: str) -> str | None:
    hay = _normalize_text(address)
    for needle, label in _CITY_HINTS:
        if needle in hay:
            return label
    return None


def list_users_with_address() -> list[dict]:
    """Trả về [{id, email, full_name, address}, ...] có address không rỗng."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, full_name, address
                FROM users
                WHERE address IS NOT NULL AND TRIM(address) <> ''
                ORDER BY id ASC
                """
            )
            rows = cur.fetchall()
    return list(rows)
