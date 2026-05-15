import os
import re
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url

_ROOT = Path(__file__).resolve().parent
_REPO = _ROOT.parent

# Backend thường có DATABASE_URL; crawl/.env ghi đè (override=True) nếu cần tách cấu hình.
load_dotenv(_REPO / "backend" / ".env", override=False)
load_dotenv(_ROOT / ".env", override=True)

BASE_URL = "https://phongtro123.com"
LIST_URL = "https://phongtro123.com/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://phongtro123.com/",
}

DELAY_MIN = 1.5
DELAY_MAX = 3.5

MAX_PAGES = 10
MAX_RETRIES = 3
OUTPUT_DIR = "data"

MYSQL_TABLE = os.getenv("MYSQL_TABLE", "craw_data")
if not re.fullmatch(r"[A-Za-z0-9_]+", MYSQL_TABLE):
    raise ValueError("MYSQL_TABLE chỉ được gồm chữ, số và dấu gạch dưới.")

_database_url = os.getenv("DATABASE_URL", "").strip()


def _from_database_url(url: str) -> dict[str, object]:
    if not url.lower().startswith("mysql"):
        raise ValueError("DATABASE_URL phải là chuỗi kết nối MySQL (mysql+pymysql://...).")
    u = make_url(url)
    return {
        "host": u.host or "127.0.0.1",
        "port": int(u.port or 3306),
        "user": u.username or "root",
        "password": u.password or "",
        "database": (u.database or "trohub").split("?")[0],
    }


def _from_mysql_env() -> dict[str, object]:
    return {
        "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", "huuxuan:1202"),
        "database": os.getenv("MYSQL_DATABASE", "trohub"),
    }


# Ưu tiên DATABASE_URL (trùng backend); không có thì dùng MYSQL_* trong .env.
if _database_url:
    _mysql = _from_database_url(_database_url)
else:
    _mysql = _from_mysql_env()

MYSQL_HOST = str(_mysql["host"])
MYSQL_PORT = int(_mysql["port"])
MYSQL_USER = str(_mysql["user"])
MYSQL_PASSWORD = str(_mysql["password"])
MYSQL_DATABASE = str(_mysql["database"])

# True khi đang dùng biến DATABASE_URL (cùng nguồn với backend).
DATABASE_URL_CONFIGURED = bool(_database_url)
