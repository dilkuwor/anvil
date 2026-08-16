from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.cheatsheets.models import CheatSheet, CheatSheetSection
from app.cheatsheets.schemas import CheatSheetBlock, CheatSheetCard, CheatSheetDetail, CheatSheetSectionOut
from app.common.errors import NotFoundError


def list_sheets(db: Session) -> list[CheatSheetCard]:
    sheets = db.scalars(
        select(CheatSheet)
        .options(selectinload(CheatSheet.sections))
        .where(CheatSheet.is_active.is_(True))
        .order_by(CheatSheet.display_order, CheatSheet.title)
    ).all()
    return [_card(sheet) for sheet in sheets]


def get_sheet(db: Session, slug: str) -> CheatSheetDetail:
    sheet = db.scalar(
        select(CheatSheet)
        .options(selectinload(CheatSheet.sections).selectinload(CheatSheetSection.contents))
        .where(CheatSheet.slug == slug, CheatSheet.is_active.is_(True))
    )
    if sheet is None:
        raise NotFoundError("Cheat sheet not found.")
    sections = sorted(sheet.sections, key=lambda item: (item.display_order, item.title))
    return CheatSheetDetail(
        id=sheet.id,
        slug=sheet.slug,
        title=sheet.title,
        description=sheet.description,
        estimated_minutes=sheet.estimated_minutes,
        section_count=len(sections),
        sections=[
            CheatSheetSectionOut(
                slug=section.slug,
                title=section.title,
                blocks=[
                    CheatSheetBlock(
                        kind=block.kind,
                        title=block.title,
                        body=block.body,
                        items=block.items,
                    )
                    for block in sorted(section.contents, key=lambda item: item.display_order)
                ],
            )
            for section in sections
        ],
    )


def _card(sheet: CheatSheet) -> CheatSheetCard:
    return CheatSheetCard(
        id=sheet.id,
        slug=sheet.slug,
        title=sheet.title,
        description=sheet.description,
        section_count=len(sheet.sections),
        estimated_minutes=sheet.estimated_minutes,
        href=f"/cheatsheets/{sheet.slug}",
    )
