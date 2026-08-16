from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.cheatsheets import service
from app.cheatsheets.schemas import CheatSheetCard, CheatSheetDetail
from app.common.database import get_db
router = APIRouter(prefix="/api/v1/cheatsheets", tags=["cheatsheets"])


@router.get("", response_model=list[CheatSheetCard])
def list_cheatsheets(
    db: Session = Depends(get_db),
) -> list[CheatSheetCard]:
    return service.list_sheets(db)


@router.get("/{slug}", response_model=CheatSheetDetail)
def get_cheatsheet(
    slug: str,
    db: Session = Depends(get_db),
) -> CheatSheetDetail:
    return service.get_sheet(db, slug)
