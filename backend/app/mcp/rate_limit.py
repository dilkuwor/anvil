from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from uuid import UUID

from app.common.config import get_settings
from app.common.errors import RateLimitError

_lock = threading.Lock()
_hits: dict[UUID, deque[float]] = defaultdict(deque)


def reset() -> None:
    with _lock:
        _hits.clear()


def check(token_id: UUID) -> None:
    limit = get_settings().mcp_rate_limit_per_minute
    if limit <= 0:
        return
    now = time.monotonic()
    window = 60.0
    with _lock:
        bucket = _hits[token_id]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            raise RateLimitError()
        bucket.append(now)
