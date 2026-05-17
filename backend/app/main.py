import asyncio
import logging
import os
import re
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers.amenities import router as amenities_router
from app.routers.chat import router as chat_router
from app.routers.favorites import router as favorites_router
from app.routers.messages import router as messages_router
from app.routers.notifications import router as notifications_router
from app.routers.reports import router as reports_router
from app.routers.rooms import router as rooms_router
from app.routers.uploads import router as uploads_router
from app.routers.users import router as users_router
from app.routers.auth import router as auth_router
from app.routers.landlord import router as landlord_router
from app.routers.admin import router as admin_router
from app.routers.geocoding import router as geocoding_router
from app.routers.search_history import router as search_history_router
from app.routers.crawl_internal import router as crawl_internal_router
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import text

load_dotenv()

# Nếu CORS_ORIGINS="" trong env, os.getenv(...) vẫn trả về chuỗi rỗng → không origin nào được phép → lỗi CORS trong trình duyệt.
_default_cors = "http://localhost:3000,http://127.0.0.1:3000"
_raw_cors = os.environ.get("CORS_ORIGINS")
if _raw_cors is None or not str(_raw_cors).strip():
    _origins = _default_cors
else:
    _origins = str(_raw_cors).strip()
allow_origins = [o.strip() for o in _origins.split(",") if o.strip()]
if not allow_origins:
    allow_origins = [o.strip() for o in _default_cors.split(",") if o.strip()]

# Dev: mọi cổng localhost / 127.0.0.1 / ::1 (regex bổ sung cho allow_origins)
_dev_origin_regex = r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"
_allow_origin_regex = (
    _dev_origin_regex if os.getenv("CORS_USE_DEV_REGEX", "1").strip() not in ("0", "false", "no") else None
)

_log = logging.getLogger("trohub.api")


def _cors_headers_for_request(request: Request) -> dict[str, str]:
    """Gắn headers CORS khi origin hợp lệ (để lỗi 500 vẫn đọc được từ FE)."""
    origin = request.headers.get("origin")
    if not origin:
        return {}
    if origin in allow_origins:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    if _allow_origin_regex and re.fullmatch(_allow_origin_regex, origin):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}

# Cho URL kiểu Vite "Network" (http://192.168.x.x:3000) — trình duyệt gửi Origin theo IP, không khớp allow_origins ở trên.
_cors_regex_env = os.getenv("CORS_ORIGIN_REGEX", "").strip()
_private_on = os.getenv("CORS_ALLOW_PRIVATE_ORIGINS", "true").strip().lower() in (
    "1",
    "true",
    "yes",
)
_default_private_origin_regex = (
    r"https?://("
    r"192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}"
    r")(:[0-9]+)?$"
)
allow_origin_regex = _cors_regex_env or (_default_private_origin_regex if _private_on else None)


def _upgrade_db_schema() -> None:
    backend_root = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_root / "alembic.ini"))
    try:
        command.upgrade(cfg, "head")
    except Exception:
        _log.exception("Alembic upgrade failed — backend vẫn khởi động; chạy thủ công: alembic upgrade head")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(_upgrade_db_schema)
    yield


app = FastAPI(
    title="TroHub Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    _log.exception("Unhandled error: %s", exc)
    headers = _cors_headers_for_request(request)
    expose = os.getenv("DEBUG", "").strip().lower() in ("1", "true", "yes")
    body = {"detail": str(exc)} if expose else {"detail": "Internal server error"}
    return JSONResponse(status_code=500, content=body, headers=headers)


app.include_router(rooms_router)
app.include_router(users_router)
app.include_router(auth_router)
app.include_router(landlord_router)
app.include_router(admin_router)
app.include_router(messages_router)
app.include_router(amenities_router)
app.include_router(favorites_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(uploads_router)
app.include_router(chat_router)
app.include_router(geocoding_router)
app.include_router(search_history_router)
app.include_router(crawl_internal_router)


@app.get("/trohub/health")
async def health_check():
    return {"status": "ok", "service": "backend"}


@app.get("/trohub/health/database")
def health_database(db: Session = Depends(get_db)):
    """Kiểm tra nhanh kết nối MySQL (dùng khi đăng ký trả 5xx)."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
