import datetime

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth_utils
import models
import rate_limit
from database import get_db
from error_handlers import register_error_handlers
from routers import auth, households

GOOD = "correct-horse-1"


@pytest.fixture
def env():
    # Throwaway in-memory database. Never touches bufin.db.
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    models.Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    def override_db():
        with Session() as db:
            yield db

    app = FastAPI()
    register_error_handlers(app)
    app.include_router(auth.router, prefix="/api/auth")
    app.include_router(households.router, prefix="/api")
    app.dependency_overrides[get_db] = override_db
    rate_limit.reset_all()
    return TestClient(app), Session


def signup(client, email="a@example.com", password=GOOD):
    return client.post("/api/auth/signup", json={"email": email, "password": password, "full_name": "A"})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


# --- password policy -------------------------------------------------------------------------

@pytest.mark.parametrize("password", ["short", "123456789", " " * 12, "x" * 129, "é" * 40])
def test_weak_or_unhashable_passwords_are_rejected_at_signup(env, password):
    client, _ = env
    assert signup(client, password=password).status_code == 422


def test_a_ten_character_password_is_accepted(env):
    client, _ = env
    assert signup(client, password="abcdefghij").status_code == 200


def test_emails_are_case_insensitive(env):
    client, _ = env
    assert signup(client, email="Mixed@Example.com").status_code == 200
    assert signup(client, email="mixed@example.COM").status_code == 400
    assert client.post("/api/auth/login", json={"email": "MIXED@example.com", "password": GOOD}).status_code == 200


# --- sign-in rate limit ----------------------------------------------------------------------

def test_repeated_wrong_passwords_lock_that_account_out_even_for_the_right_password(env):
    client, _ = env
    signup(client)
    for _ in range(5):
        assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-password"}).status_code == 401
    locked = client.post("/api/auth/login", json={"email": "a@example.com", "password": GOOD})
    assert locked.status_code == 429
    assert int(locked.headers["Retry-After"]) > 0


def test_a_lockout_does_not_affect_other_accounts_and_a_good_login_resets_the_count(env):
    client, _ = env
    signup(client, "a@example.com")
    signup(client, "b@example.com")
    for _ in range(4):
        client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-password"})
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": GOOD}).status_code == 200  # resets
    for _ in range(4):
        client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-password"})
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": GOOD}).status_code == 200
    for _ in range(5):
        client.post("/api/auth/login", json={"email": "b@example.com", "password": "wrong-password"})
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": GOOD}).status_code == 200


def test_signup_is_limited_per_client(env):
    client, _ = env
    codes = [signup(client, f"user{i}@example.com").status_code for i in range(7)]
    assert codes[:5] == [200] * 5 and codes[5] == 429


# --- token revocation ------------------------------------------------------------------------

def test_changing_the_password_revokes_old_tokens_and_returns_a_working_new_one(env):
    client, _ = env
    old = signup(client).json()["access_token"]
    assert client.get("/api/auth/me", headers=bearer(old)).status_code == 200

    changed = client.post("/api/auth/change-password", headers=bearer(old),
                          json={"old_password": GOOD, "new_password": "brand-new-pass-2"})
    assert changed.status_code == 200
    fresh = changed.json()["access_token"]

    assert client.get("/api/auth/me", headers=bearer(old)).status_code == 401
    assert client.get("/api/auth/me", headers=bearer(fresh)).status_code == 200
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "brand-new-pass-2"}).status_code == 200


def test_tokens_issued_before_the_claim_existed_keep_working_until_the_password_changes(env):
    client, _ = env
    signup(client)
    legacy = auth_utils.create_access_token({"sub": "a@example.com"}, datetime.timedelta(minutes=5))  # no "tv"
    assert client.get("/api/auth/me", headers=bearer(legacy)).status_code == 200
    client.post("/api/auth/change-password", headers=bearer(legacy),
                json={"old_password": GOOD, "new_password": "brand-new-pass-2"})
    assert client.get("/api/auth/me", headers=bearer(legacy)).status_code == 401


def test_change_password_enforces_the_policy_and_limits_wrong_guesses(env):
    client, _ = env
    token = signup(client).json()["access_token"]
    assert client.post("/api/auth/change-password", headers=bearer(token),
                       json={"old_password": GOOD, "new_password": "short"}).status_code == 422
    for _ in range(5):
        assert client.post("/api/auth/change-password", headers=bearer(token),
                           json={"old_password": "nope-nope-nope", "new_password": "brand-new-pass-2"}).status_code == 400
    assert client.post("/api/auth/change-password", headers=bearer(token),
                       json={"old_password": GOOD, "new_password": "brand-new-pass-2"}).status_code == 429


# --- household invites -----------------------------------------------------------------------

def test_new_invite_codes_are_longer_and_old_short_ones_still_work(env):
    client, Session = env
    owner = signup(client, "owner@example.com").json()["access_token"]
    joiner = signup(client, "joiner@example.com").json()["access_token"]
    household = client.post("/api/households", headers=bearer(owner), json={"name": "Home"}).json()

    code = client.post(f"/api/households/{household['id']}/invites", headers=bearer(owner)).json()["code"]
    assert len(code) == 16 and code == code.upper()

    with Session() as db:  # a code issued before this change
        db.add(models.HouseholdInvite(id="old", household_id=household["id"], code="ABCD1234",
                                      created_by=db.query(models.User).filter_by(email="owner@example.com").one().id,
                                      expires_at=(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()))
        db.commit()
    assert client.post("/api/households/join", headers=bearer(joiner), json={"code": "abcd1234"}).status_code == 200


def test_guessing_invite_codes_is_limited(env):
    client, _ = env
    token = signup(client).json()["access_token"]
    statuses = [client.post("/api/households/join", headers=bearer(token), json={"code": f"WRONG{i:03d}"}).status_code for i in range(12)]
    assert statuses[:10] == [404] * 10 and statuses[10] == 429


# --- the limiter itself ----------------------------------------------------------------------

def test_the_window_expires_and_memory_is_bounded():
    now = [0.0]
    limiter = rate_limit.SlidingWindowLimiter(limit=2, window_seconds=10, clock=lambda: now[0], max_keys=50)
    limiter.record("k"); limiter.record("k")
    with pytest.raises(Exception):
        limiter.check("k")
    now[0] = 11
    limiter.check("k")  # old hits aged out
    for i in range(500):
        limiter.record(f"key{i}")
    assert limiter.size() <= 50


# --- review follow-ups -----------------------------------------------------------------------

def test_a_burst_of_parallel_guesses_cannot_exceed_the_limit():
    import threading

    limiter = rate_limit.SlidingWindowLimiter(limit=5, window_seconds=60)
    allowed, refused, gate = [], [], threading.Barrier(50)

    def attempt():
        gate.wait()
        try:
            limiter.hit("victim")
            allowed.append(1)
        except Exception:
            refused.append(1)

    threads = [threading.Thread(target=attempt) for _ in range(50)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert len(allowed) == 5 and len(refused) == 45


def test_release_gives_an_attempt_back():
    limiter = rate_limit.SlidingWindowLimiter(limit=1, window_seconds=60)
    limiter.hit("k")
    limiter.release("k")
    limiter.hit("k")  # would raise if the first hit were still counted


def test_email_case_and_whitespace_variants_share_one_lockout(env):
    client, _ = env
    signup(client)
    for variant in ("a@example.com", "A@Example.com", " a@example.com ", "A@EXAMPLE.COM", "a@example.com"):
        client.post("/api/auth/login", json={"email": variant, "password": "wrong-password"})
    assert client.post("/api/auth/login", json={"email": "a@EXAMPLE.com", "password": GOOD}).status_code == 429


def test_guessing_across_many_accounts_from_one_client_is_capped(env):
    client, _ = env
    statuses = [client.post("/api/auth/login", json={"email": f"nobody{i}@example.com", "password": "wrong-password"}).status_code
                for i in range(32)]
    assert statuses[:30] == [401] * 30 and statuses[30] == 429


def test_an_unknown_email_gets_the_same_answer_as_a_wrong_password(env):
    client, _ = env
    signup(client)
    unknown = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "wrong-password"})
    wrong = client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong-password"})
    assert unknown.status_code == wrong.status_code == 401 and unknown.json() == wrong.json()


def test_an_overlong_sign_in_password_is_rejected_not_a_server_error(env):
    client, _ = env
    signup(client)
    assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "x" * 5000}).status_code == 422


def test_the_new_password_must_differ_from_the_old_one(env):
    client, _ = env
    token = signup(client).json()["access_token"]
    response = client.post("/api/auth/change-password", headers=bearer(token), json={"old_password": GOOD, "new_password": GOOD})
    assert response.status_code == 400
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 200  # nothing was revoked


def test_a_signup_that_loses_a_race_for_the_email_is_a_400_not_a_500(env, monkeypatch):
    client, Session = env
    signup(client, "taken@example.com")
    real_first = auth.func.lower  # the existence check is bypassed so the INSERT itself collides

    class Blind:
        def __call__(self, column):
            return real_first("nothing-matches-this")
    monkeypatch.setattr(auth.func, "lower", Blind())
    assert signup(client, "taken@example.com").status_code == 400
