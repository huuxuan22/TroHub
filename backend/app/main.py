import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

load_dotenv()

_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
allow_origins = [o.strip() for o in _origins.split(",") if o.strip()]


def _upgrade_db_schema() -> None:
    backend_root = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_root / "alembic.ini"))
    command.upgrade(cfg, "head")


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rooms_router)
app.include_router(users_router)
app.include_router(auth_router)
app.include_router(messages_router)
app.include_router(amenities_router)
app.include_router(favorites_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(uploads_router)
app.include_router(chat_router)


@app.get("/trohub/health")
async def health_check():
    return {"status": "ok", "service": "backend"}
