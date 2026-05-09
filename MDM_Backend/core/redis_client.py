"""
core/redis_client.py
----------------------
Centralized Redis connection pool — single shared instance across the
entire application (middleware, workers, any future cache usage).

ALL code that needs Redis must import `get_redis()` from here.
This avoids creating multiple independent connection pools and keeps
memory usage minimal.

Usage:
    from core.redis_client import get_redis

    r = get_redis()
    r.set("key", "value", ex=3600)
    r.get("key")
"""

from __future__ import annotations

import os
import logging

import redis
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Single connection pool — created once, reused forever
# ---------------------------------------------------------------------------
_pool: redis.ConnectionPool | None = None


def get_pool() -> redis.ConnectionPool:
    """
    Return the shared connection pool, creating it on first call.

    Pool settings:
      - max_connections=20  : cap for the entire process
      - decode_responses=True : return str instead of bytes (easier to use)
      - socket_connect_timeout=3 : fail fast if Redis is unreachable
      - socket_timeout=3         : fail fast on slow Redis operations
    """
    global _pool
    if _pool is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _pool = redis.ConnectionPool.from_url(
            redis_url,
            max_connections=20,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
        )
        logger.info("[RedisClient] Connection pool initialised → %s", redis_url)
    return _pool


def get_redis() -> redis.Redis:
    """
    Return a Redis client backed by the shared pool.

    Callers should NOT call .close() on the returned client — connections
    are returned to the pool automatically when the request is done.
    """
    return redis.Redis(connection_pool=get_pool())


def is_redis_available() -> bool:
    """
    Ping Redis to check connectivity. Returns False (not an exception)
    when Redis is unreachable, so the app can degrade gracefully.
    """
    try:
        get_redis().ping()
        return True
    except Exception:
        return False
