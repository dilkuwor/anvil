"""Seed the Microsoft Interview custom list for one user.

Usage (from backend/):

    python -m app.seed_microsoft_interview --username YOUR_USERNAME

Safe to run multiple times. Existing problems and extra list items are left intact.
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import func, select

from app.common import models as _models  # noqa: F401
from app.common.database import SessionLocal
from app.lists.seed_microsoft import seed_microsoft_interview_problems
from app.users.models import User


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Idempotently seed the Microsoft Interview list.")
    parser.add_argument("--username", required=True, help="Account that should own the list.")
    args = parser.parse_args(argv)

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(func.lower(User.username) == args.username.lower()))
        if user is None:
            print(f"No user named {args.username!r}.", file=sys.stderr)
            return 1
        report = seed_microsoft_interview_problems(db, user.id)
        if not report.order_verified or report.found != report.expected:
            db.rollback()
            print(report.format(), file=sys.stderr)
            print("Seed rolled back: validation failed.", file=sys.stderr)
            return 1
        db.commit()
        print(report.format())
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
