import json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from backend.firebase import get_service_mode


class ResponseWrapperMiddleware(BaseHTTPMiddleware):
    """Wrap successful JSON API responses in a ``{"data": ...}`` envelope.

    Error responses (>=400) are left untouched so they keep the
    ``{"message": ..., "detail": ...}`` shape.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        content_type = response.headers.get("content-type", "")
        should_wrap = (
            request.url.path.startswith("/api")
            and content_type.startswith("application/json")
            and 200 <= response.status_code < 300
        )
        if not should_wrap:
            return response

        body = b"".join([section async for section in response.body_iterator])
        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response(
                content=body,
                status_code=response.status_code,
                media_type=response.media_type,
            )

        if not (isinstance(payload, dict) and "data" in payload):
            payload = {"data": payload}
        return JSONResponse(status_code=response.status_code, content=payload)


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException):
        detail = exc.detail
        return JSONResponse(
            status_code=exc.status_code,
            content={"message": detail, "detail": detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"message": str(exc), "detail": str(exc)})
