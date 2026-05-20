from __future__ import annotations

from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.observability import current_request_id, get_logger


def _request_id(request: Request) -> str:
    rid = getattr(request.state, "request_id", None)
    return str(rid or current_request_id() or "-")


def _error_code_from_status(status_code: int) -> str:
    return f"http_{status_code}"


def _message_from_status(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Unexpected error"


def error_payload(
    *,
    status_code: int,
    request_id: str,
    message: str | None = None,
    details: Any | None = None,
    code: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "error": {
            "code": code or _error_code_from_status(status_code),
            "message": message or _message_from_status(status_code),
            "request_id": request_id,
            "details": details,
        }
    }
    return payload


def _json_error_response(
    *,
    status_code: int,
    request_id: str,
    message: str | None = None,
    details: Any | None = None,
    code: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    response_headers = {"X-Request-ID": request_id}
    if headers:
        response_headers.update(headers)
    return JSONResponse(
        status_code=status_code,
        content=error_payload(
            status_code=status_code,
            request_id=request_id,
            message=message,
            details=details,
            code=code,
        ),
        headers=response_headers,
    )


def install_exception_handlers(app: FastAPI) -> None:
    logger = get_logger()

    @app.exception_handler(HTTPException)
    async def fastapi_http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        request_id = _request_id(request)
        message = exc.detail if isinstance(exc.detail, str) else _message_from_status(exc.status_code)
        return _json_error_response(
            status_code=exc.status_code,
            request_id=request_id,
            message=message,
            details=exc.detail,
            headers=exc.headers,
        )

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = _request_id(request)
        message = exc.detail if isinstance(exc.detail, str) else _message_from_status(exc.status_code)
        return _json_error_response(
            status_code=exc.status_code,
            request_id=request_id,
            message=message,
            details=exc.detail,
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = _request_id(request)
        return _json_error_response(
            status_code=422,
            request_id=request_id,
            message="Request validation failed",
            details=exc.errors(),
            code="validation_error",
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = _request_id(request)
        logger.exception(
            "request.unhandled_exception",
            extra={
                "props": {
                    "request_id": request_id,
                    "route": request.url.path,
                    "method": request.method,
                }
            },
        )
        return _json_error_response(
            status_code=500,
            request_id=request_id,
            message="Internal server error",
            details=None,
            code="internal_error",
        )
