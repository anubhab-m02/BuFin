import asyncio
import logging

import pytest
import requests
from fastapi import HTTPException

import ai_service

KEY = "sekret-key-123"


@pytest.fixture(autouse=True)
def fake_key(monkeypatch):
    monkeypatch.setattr(ai_service, "API_KEY", KEY)


class FakeResponse:
    def __init__(self, status=200, body=None):
        self.status_code = status
        self._body = body if body is not None else {"candidates": [{"content": {"parts": [{"text": "hello"}]}}]}
        self.text = "upstream said no"

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} for url: https://x/?key={KEY}", response=self)

    def json(self):
        return self._body


def run_coach():
    return asyncio.run(ai_service.coach_chat("hi", "analyst", {}))


def test_key_goes_in_a_header_never_the_url_and_a_timeout_is_set(monkeypatch):
    seen = {}

    def fake_post(url, **kwargs):
        seen["url"], seen["kwargs"] = url, kwargs
        return FakeResponse()

    monkeypatch.setattr(requests, "post", fake_post)
    assert run_coach() == "hello"
    assert KEY not in seen["url"] and "key=" not in seen["url"]
    assert seen["kwargs"]["headers"]["x-goog-api-key"] == KEY
    assert seen["kwargs"]["timeout"] > 0


@pytest.mark.parametrize("failure,expected", [
    (lambda *a, **k: FakeResponse(429), 429),
    (lambda *a, **k: FakeResponse(500), 502),
    (lambda *a, **k: (_ for _ in ()).throw(requests.Timeout("slow")), 504),
    (lambda *a, **k: (_ for _ in ()).throw(requests.ConnectionError("down")), 502),
])
def test_upstream_failures_are_http_errors_not_chat_text(monkeypatch, failure, expected):
    monkeypatch.setattr(requests, "post", failure)
    with pytest.raises(HTTPException) as err:
        run_coach()
    assert err.value.status_code == expected
    assert KEY not in str(err.value.detail)


def test_missing_key_is_a_503_not_a_bare_exception(monkeypatch):
    monkeypatch.setattr(ai_service, "API_KEY", None)
    with pytest.raises(HTTPException) as err:
        run_coach()
    assert err.value.status_code == 503


def test_failure_logs_never_contain_the_key(monkeypatch, caplog):
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(500))
    with caplog.at_level(logging.DEBUG), pytest.raises(HTTPException):
        run_coach()
    assert KEY not in caplog.text


def test_blocked_or_malformed_answers_are_502s(monkeypatch):
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(200, {"candidates": []}))
    with pytest.raises(HTTPException) as err:
        run_coach()
    assert err.value.status_code == 502


def test_malformed_candidate_shapes_are_502s_not_500s(monkeypatch):
    body = {"candidates": [{"content": {"parts": [{"text": "hi"}]}, "groundingMetadata": "oops"}]}
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(200, body))
    with pytest.raises(HTTPException) as err:
        run_coach()
    assert err.value.status_code == 502


def test_quota_error_has_the_user_facing_message(monkeypatch):
    monkeypatch.setattr(requests, "post", lambda *a, **k: FakeResponse(429))
    with pytest.raises(HTTPException) as err:
        run_coach()
    assert "Quota" in err.value.detail
