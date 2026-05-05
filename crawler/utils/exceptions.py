"""Domain-level exceptions mapped to HTTP responses by FastAPI handlers."""


class AppError(Exception):
    """Base application error with HTTP status and machine-readable code."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "app_error",
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, status_code=404, code="not_found")


class CrawlError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=502, code="crawl_failed")


class ValidationAppError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=422, code="validation_error")
