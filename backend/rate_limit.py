"""Small in-process sliding-window rate limiter for the endpoints an attacker can hammer
(sign-in, sign-up, change-password, joining a household by code).

ponytail: process-local. With several API instances each keeps its own counters, so the effective
limit is limit x instances, and a restart clears them. The planned replacement is a Postgres-backed
limiter behind this same interface (ADR-6 in docs/architecture/DECISIONS.md); that is enough for a
single instance today and needs no new dependency.
"""
import math
import threading
import time
from collections import OrderedDict, deque
from typing import Callable, Deque

from fastapi import HTTPException, Request


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float, *, clock: Callable[[], float] = time.monotonic,
                 max_keys: int = 10_000):
        self.limit = limit
        self.window = window_seconds
        self._clock = clock
        self._max_keys = max_keys
        self._hits: "OrderedDict[str, Deque[float]]" = OrderedDict()
        self._lock = threading.Lock()

    def _prune(self, key: str) -> Deque[float]:
        hits = self._hits.get(key)
        if hits is None:
            return deque()
        cutoff = self._clock() - self.window
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if not hits:
            del self._hits[key]
            return deque()
        return hits

    def check(self, key: str) -> None:
        """Raise 429 (with Retry-After) if `key` already used up its allowance. Does not record."""
        with self._lock:
            hits = self._prune(key)
            if len(hits) >= self.limit:
                retry_after = max(1, math.ceil(hits[0] + self.window - self._clock()))
                raise HTTPException(
                    status_code=429,
                    detail="Too many attempts. Please wait before trying again.",
                    headers={"Retry-After": str(retry_after)},
                )

    def record(self, key: str) -> None:
        with self._lock:
            hits = self._prune(key)
            if not hits:
                self._hits[key] = hits = deque()
            hits.append(self._clock())
            self._hits.move_to_end(key)
            while len(self._hits) > self._max_keys:  # bound memory: drop the least recently used
                self._hits.popitem(last=False)

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def size(self) -> int:
        with self._lock:
            return len(self._hits)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


# Wrong passwords per (client, account): 5 in 15 minutes locks that pair for the rest of the window.
login_failures = SlidingWindowLimiter(limit=5, window_seconds=15 * 60)
# Wrong passwords from one client across all accounts (slows a guess-many-accounts attack).
login_failures_by_client = SlidingWindowLimiter(limit=30, window_seconds=15 * 60)
# Every sign-up attempt from one client.
signups_by_client = SlidingWindowLimiter(limit=5, window_seconds=60 * 60)
# Wrong "current password" attempts on change-password, per signed-in user.
password_change_failures = SlidingWindowLimiter(limit=5, window_seconds=15 * 60)
# Invite codes that did not match, per signed-in user (codes are guessable only by brute force).
invite_failures = SlidingWindowLimiter(limit=10, window_seconds=15 * 60)

_ALL = (login_failures, login_failures_by_client, signups_by_client, password_change_failures, invite_failures)


def reset_all() -> None:
    """For tests: forget every counter."""
    for limiter in _ALL:
        limiter.clear()


def client_key(request: Request) -> str:
    # Behind a reverse proxy every request shares the proxy's address; honouring X-Forwarded-For
    # safely needs a trusted-proxy setting, which comes with the deployment work (#142).
    return request.client.host if request.client else "unknown"
