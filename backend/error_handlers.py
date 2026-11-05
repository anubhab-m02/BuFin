from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def validation_error_handler(request: Request, exc: RequestValidationError):
    # FastAPI's default 422 body echoes the rejected "input" back. That would return
    # submitted passwords, and a NaN/Infinity input cannot be JSON-encoded at all (500).
    errors = [{k: v for k, v in error.items() if k not in ("input", "ctx", "url")} for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(errors)})


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, validation_error_handler)
