from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.buddy import service
from app.buddy.schemas import BuddySendIn, BuddyThreadDetail, BuddyThreadOut, ContextKind
from app.common.database import get_db
from app.common.deps import get_current_user
from app.users.models import User

router = APIRouter(prefix="/api/v1/buddy", tags=["buddy"])


@router.get("/threads", response_model=list[BuddyThreadOut])
def list_threads(
    context_kind: ContextKind | None = Query(default=None),
    context_id: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BuddyThreadOut]:
    return service.list_threads(db, current_user.id, context_kind=context_kind, context_id=context_id, limit=limit)


@router.get("/threads/{thread_id}", response_model=BuddyThreadDetail)
def get_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BuddyThreadDetail:
    return service.get_thread(db, current_user.id, thread_id)


@router.delete("/threads/{thread_id}", status_code=204)
def delete_thread(
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    service.delete_thread(db, current_user.id, thread_id)


@router.post("/messages")
def send_message(
    payload: BuddySendIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Stream Buddy's reply as server-sent events: thread_id, delta..., done."""
    return StreamingResponse(
        service.send(db, current_user, payload),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
