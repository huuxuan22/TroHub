"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from api.crawl import router as crawl_router  # noqa: E402
from api.rooms import router as rooms_router  # noqa: E402
from utils.exceptions import AppError  # noqa: E402

OPENAPI_TAGS = [
    {
        "name": "health",
        "description": "Kiểm tra service còn sống (liveness/readiness).",
    },
    {
        "name": "crawl",
        "description": "Kích hoạt tải trang, parse HTML theo selector trong cấu hình, ghi `crawl_history`.",
    },
    {
        "name": "rooms",
        "description": "Đọc dữ liệu tin đã crawl (bảng lịch sử).",
    },
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifecycle hook (extend for startup/shutdown tasks)."""
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="TroHub Crawler API",
        description=(
            "REST API cho luồng crawl tin phòng trọ: HTTP client + BeautifulSoup, "
            "cấu hình selector qua biến môi trường. **Swagger UI:** `/docs` — **OpenAPI JSON:** `/openapi.json` — **ReDoc:** `/redoc`."
        ),
        version="1.0.0",
        lifespan=lifespan,
        openapi_tags=OPENAPI_TAGS,
        contact={"name": "TroHub"},
    )

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "code": exc.code},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": exc.errors(),
                "code": "request_validation_error",
            },
        )

    @app.get(
        "/health",
        tags=["health"],
        summary="Health check",
        response_model=dict[str, str],
        responses={
            200: {
                "description": "Service OK",
                "content": {
                    "application/json": {"example": {"status": "ok"}},
                },
            },
        },
    )
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(rooms_router)
    app.include_router(crawl_router)
    return app


app = create_app()
