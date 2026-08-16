from __future__ import annotations

import sys
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cheatsheets.models import CheatSheet, CheatSheetSection, CheatSheetSectionContent

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from database.seeds.cheatsheets import CHEAT_SHEETS  # noqa: E402


def seed_cheatsheets(db: Session) -> tuple[int, int, int]:
    for spec in CHEAT_SHEETS:
        sheet = db.scalar(select(CheatSheet).where(CheatSheet.slug == spec["slug"]))
        if sheet is None:
            sheet = CheatSheet(id=uuid.uuid4(), slug=spec["slug"])
            db.add(sheet)
        sheet.title = spec["title"]
        sheet.description = spec["description"]
        sheet.estimated_minutes = spec["minutes"]
        sheet.display_order = spec["order"]
        sheet.is_active = True
        db.flush()

        seen: set[str] = set()
        for index, section_spec in enumerate(spec["sections"], start=1):
            seen.add(section_spec["slug"])
            section = db.scalar(
                select(CheatSheetSection).where(
                    CheatSheetSection.cheat_sheet_id == sheet.id,
                    CheatSheetSection.slug == section_spec["slug"],
                )
            )
            if section is None:
                section = CheatSheetSection(id=uuid.uuid4(), cheat_sheet_id=sheet.id, slug=section_spec["slug"])
                db.add(section)
            section.title = section_spec["title"]
            section.display_order = index
            db.flush()

            existing = db.scalars(
                select(CheatSheetSectionContent).where(CheatSheetSectionContent.section_id == section.id)
            ).all()
            for content in existing:
                db.delete(content)
            if existing:
                db.flush()
            for order, block in enumerate(section_spec.get("blocks") or [], start=1):
                db.add(
                    CheatSheetSectionContent(
                        id=uuid.uuid4(),
                        section_id=section.id,
                        kind=block["kind"],
                        title=block.get("title") or "",
                        body=block.get("body") or "",
                        items=block.get("items"),
                        display_order=order,
                    )
                )

        stale = db.scalars(
            select(CheatSheetSection).where(
                CheatSheetSection.cheat_sheet_id == sheet.id,
                CheatSheetSection.slug.notin_(seen) if seen else CheatSheetSection.slug.is_(None),
            )
        ).all()
        for section in stale:
            db.delete(section)
        db.flush()

    return (
        len(CHEAT_SHEETS),
        sum(len(spec["sections"]) for spec in CHEAT_SHEETS),
        sum(len(section.get("blocks") or []) for spec in CHEAT_SHEETS for section in spec["sections"]),
    )
