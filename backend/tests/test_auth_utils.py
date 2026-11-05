import importlib

import pytest

import auth_utils


def reload_with(monkeypatch, **env):
    for key in ("JWT_SECRET_KEY", "BUFIN_ENV"):
        monkeypatch.delenv(key, raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    return importlib.reload(auth_utils)


def test_production_requires_secret(monkeypatch):
    with pytest.raises(RuntimeError):
        reload_with(monkeypatch, BUFIN_ENV="production")


def test_production_rejects_short_secret(monkeypatch):
    with pytest.raises(RuntimeError):
        reload_with(monkeypatch, BUFIN_ENV="production", JWT_SECRET_KEY="short")


def test_production_accepts_long_secret(monkeypatch):
    secret = "x" * 40
    assert reload_with(monkeypatch, BUFIN_ENV="production", JWT_SECRET_KEY=secret).SECRET_KEY == secret


def test_development_warns_and_uses_fallback(monkeypatch):
    with pytest.warns(UserWarning):
        module = reload_with(monkeypatch)
    assert module.SECRET_KEY == module._DEV_SECRET


def test_token_roundtrip_uses_configured_secret(monkeypatch):
    module = reload_with(monkeypatch, JWT_SECRET_KEY="k" * 40)
    token = module.create_access_token({"sub": "a@b.c"})
    assert module.jwt.decode(token, "k" * 40, algorithms=[module.ALGORITHM])["sub"] == "a@b.c"
