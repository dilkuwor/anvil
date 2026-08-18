"""Versioned simulator sample graphs (JSON). Not stored in Postgres."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_SAMPLES_DIR = Path(__file__).resolve().parent / "samples"


@lru_cache
def load_sample(slug: str) -> dict[str, Any] | None:
    if not slug or "/" in slug or "\\" in slug or slug.startswith("."):
        return None
    path = _SAMPLES_DIR / f"{slug}.json"
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
