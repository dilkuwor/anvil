from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.common.logging import get_logger

logger = get_logger(__name__)


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "bad_request"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found."):
        super().__init__(message, status_code=404, code="not_found")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required."):
        super().__init__(message, status_code=401, code="unauthorized")


class ForbiddenError(AppError):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(message, status_code=403, code="forbidden")


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists."):
        super().__init__(message, status_code=409, code="conflict")


def _error_body(message: str, code: str, status_code: int) -> dict:
    return {"error": {"message": message, "code": code, "status": status_code}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.message, exc.code, exc.status_code),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        code = "not_found" if exc.status_code == 404 else "http_error"
        if exc.status_code == 401:
            code = "unauthorized"
        elif exc.status_code == 403:
            code = "forbidden"
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(message, code, exc.status_code),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "message": "Invalid request.",
                    "code": "validation_error",
                    "status": 422,
                    "details": jsonable_encoder(exc.errors()),
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_exception", error=str(exc))
        return JSONResponse(
            status_code=500,
            content=_error_body("Internal server error.", "internal_error", 500),
        )
