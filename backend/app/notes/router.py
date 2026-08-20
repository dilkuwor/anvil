from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.common.enums import NoteSourceType
from app.notes import service
from app.notes.schemas import NoteCreate, NoteOut, NoteUpdate
from app.users.models import User

router = APIRouter(prefix="/api/v1/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
def list_notes(
    source_type: NoteSourceType | None = Query(default=None),
    source_id: str | None = Query(default=None, max_length=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NoteOut]:
    return service.list_notes(
        db,
        current_user.id,
        source_type=source_type.value if source_type else None,
        source_id=source_id,
    )


@router.post("", response_model=NoteOut, status_code=201)
def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoteOut:
    return service.create_note(db, current_user.id, payload)


@router.get("/{note_id}", response_model=NoteOut)
def get_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoteOut:
    return service.get_note(db, current_user.id, note_id)


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: UUID,
    payload: NoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoteOut:
    return service.update_note(db, current_user.id, note_id, payload)


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    service.delete_note(db, current_user.id, note_id)
    return Response(status_code=204)
