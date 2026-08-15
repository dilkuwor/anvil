from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.progress import service
from app.progress.schemas import ActivityDay, ProgressSummary
from app.users.models import User

router = APIRouter(prefix="/api/v1", tags=["progress"])


@router.get("/progress", response_model=ProgressSummary)
def get_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProgressSummary:
    return ProgressSummary.model_validate(service.get_progress_summary(db, current_user.id))


@router.get("/activity", response_model=list[ActivityDay])
def get_activity(
    days: int = Query(default=120, ge=7, le=400),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ActivityDay]:
    return [ActivityDay.model_validate(item) for item in service.get_activity(db, current_user.id, days)]
