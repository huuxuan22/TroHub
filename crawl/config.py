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

# Số tin mặc định mỗi request crawl / search (có thể ghi đè qua body hoặc query).
DEFAULT_CRAWL_MAX_ITEMS = int(os.getenv("DEFAULT_CRAWL_MAX_ITEMS", "30"))

MYSQL_TABLE = os.getenv("MYSQL_TABLE", "crawl_data")
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

# Sau khi ghi crawl_data: POST tới backend để chuẩn hóa nền. Mặc định rỗng = không gọi.
BACKEND_NORMALIZE_URL = os.getenv("BACKEND_NORMALIZE_URL", "").strip()
# Gốc backend (health/docs); nếu trống sẽ suy ra từ BACKEND_NORMALIZE_URL.
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "").strip()
CRAWL_NORMALIZE_WEBHOOK_SECRET = os.getenv("CRAWL_NORMALIZE_WEBHOOK_SECRET", "").strip()
# Backend có thể chậm khi vừa reload / chạy alembic lúc startup.
BACKEND_NORMALIZE_TIMEOUT = int(os.getenv("BACKEND_NORMALIZE_TIMEOUT", "30"))

# Geocode từ địa chỉ ngay lúc crawl (chậm với nhiều tin). Mặc định tắt — backend geocode khi insert rooms.
GEOCODE_ON_CRAWL = os.getenv("GEOCODE_ON_CRAWL", "false").strip().lower() in ("1", "true", "yes")

# True khi đang dùng biến DATABASE_URL (cùng nguồn với backend).
DATABASE_URL_CONFIGURED = bool(_database_url)

# Job nền: mỗi N giây crawl 1 lần theo users.address (round-robin, logic /crawl/by-filters).
SCHEDULED_CRAWL_ENABLED = os.getenv("SCHEDULED_CRAWL_ENABLED", "true").strip().lower() in (
    "1",
    "true",
    "yes",
)
SCHEDULED_CRAWL_INTERVAL_SECONDS = max(30, int(os.getenv("SCHEDULED_CRAWL_INTERVAL_SECONDS", "60")))
SCHEDULED_CRAWL_MAX_PAGES = max(1, min(200, int(os.getenv("SCHEDULED_CRAWL_MAX_PAGES", "5"))))
