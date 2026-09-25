"""Repo-root alias for the study path.

The curriculum lives in ``app.study.path``. The API image does not contain
``database/``, so the running server must not import this module.
"""

from __future__ import annotations

import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[2] / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.study.path import BOX_DAYS, DAILY_REVIEW_CAP, UNITS, unit_for_problem, validate_path  # noqa: E402

__all__ = ["BOX_DAYS", "DAILY_REVIEW_CAP", "UNITS", "unit_for_problem", "validate_path"]
