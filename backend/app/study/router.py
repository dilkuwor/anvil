from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.common.errors import ServiceUnavailableError
from app.study import reminders, service
from app.study.schemas import (
    DesignOutlineIn,
    DesignOutlineOut,
    PathOut,
    RateIn,
    RateOut,
    ReadinessOut,
    ReviewQueueOut,
    StudySettingsOut,
    StudySettingsUpdate,
    TodayOut,
    ToggleOut,
)
from app.users.models import User

router = APIRouter(prefix="/api/v1/study", tags=["study"])


def _today(db: Session, user: User, tz: str | None):
    settings = service.get_or_create_settings(db, user.id, tz)
    return service.local_today(settings)


@router.get("/today", response_model=TodayOut)
def today(
    tz: str | None = Query(default=None, max_length=64),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TodayOut:
    return service.get_today(db, current_user.id, _today(db, current_user, tz))


@router.post("/today/tasks/{task_id}/toggle", response_model=TodayOut)
def toggle_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TodayOut:
    return service.toggle_task(db, current_user.id, _today(db, current_user, None), task_id)


@router.get("/reviews", response_model=ReviewQueueOut)
def reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewQueueOut:
    return service.review_queue(db, current_user.id, _today(db, current_user, None))


@router.post("/reviews/{card_id}/rate", response_model=RateOut)
def rate(
    card_id: UUID,
    payload: RateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RateOut:
    return service.rate_card(db, current_user.id, card_id, payload.rating, _today(db, current_user, None))


@router.get("/readiness", response_model=ReadinessOut)
def readiness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReadinessOut:
    return service.get_readiness(db, current_user.id, _today(db, current_user, None))


@router.get("/path", response_model=PathOut)
def path(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PathOut:
    return service.get_path(db, current_user.id, _today(db, current_user, None))


@router.post("/path/items/{item_key}/toggle", response_model=ToggleOut)
def toggle_item(
    item_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ToggleOut:
    return service.toggle_item(db, current_user.id, item_key, _today(db, current_user, None))


@router.get("/outline/{design}", response_model=DesignOutlineOut)
def outline(
    design: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DesignOutlineOut:
    return service.get_outline(db, current_user.id, design)


@router.put("/outline/{design}", response_model=DesignOutlineOut)
def save_outline(
    design: str,
    payload: DesignOutlineIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DesignOutlineOut:
    return service.save_outline(db, current_user.id, design, payload, _today(db, current_user, None))


@router.get("/settings", response_model=StudySettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudySettingsOut:
    return service.settings_out(service.get_or_create_settings(db, current_user.id))


@router.put("/settings", response_model=StudySettingsOut)
def put_settings(
    payload: StudySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudySettingsOut:
    return service.update_settings(db, current_user.id, payload)


@router.post("/settings/test-email")
def test_email(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    if not reminders.email_ready():
        raise ServiceUnavailableError("Email is not set up on this server.")
    reminders.send_reminder(db, current_user, force=True)
    return Response(status_code=204)
