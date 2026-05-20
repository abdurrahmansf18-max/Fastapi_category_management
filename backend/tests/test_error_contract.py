from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

from app.core.error_handling import install_exception_handlers


def _build_app() -> FastAPI:
    app = FastAPI()
    install_exception_handlers(app)

    @app.middleware("http")
    async def inject_request_id(request: Request, call_next):
        request.state.request_id = "req-test-123"
        response = await call_next(request)
        response.headers["X-Request-ID"] = "req-test-123"
        return response

    @app.get("/http")
    async def raise_http():
        raise HTTPException(status_code=403, detail="not allowed")

    @app.get("/boom")
    async def raise_unhandled():
        raise RuntimeError("boom")

    @app.get("/items/{item_id}")
    async def item_detail(item_id: int):
        return {"item_id": item_id}

    return app


def test_http_exception_uses_error_contract_and_request_id_header():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/http")
    body = response.json()

    assert response.status_code == 403
    assert response.headers["X-Request-ID"] == "req-test-123"
    assert body["error"]["code"] == "http_403"
    assert body["error"]["message"] == "not allowed"
    assert body["error"]["request_id"] == "req-test-123"


def test_validation_error_uses_error_contract():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/items/not-int")
    body = response.json()

    assert response.status_code == 422
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["request_id"] == "req-test-123"
    assert isinstance(body["error"]["details"], list)


def test_unhandled_exception_returns_internal_error_contract():
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/boom")
    body = response.json()

    assert response.status_code == 500
    assert body["error"]["code"] == "internal_error"
    assert body["error"]["message"] == "Internal server error"
    assert body["error"]["request_id"] == "req-test-123"
