from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.interviews import service
from app.interviews.schemas import (
    ActiveInterviewResponse,
    InterviewEventRequest,
    InterviewMessageRequest,
    InterviewSessionOut,
    StartInterviewRequest,
)
from app.users.models import User

router = APIRouter(prefix="/api/v1/interviews", tags=["interviews"])


@router.post("", response_model=InterviewSessionOut)
def start_interview(
    payload: StartInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = service.start_session(db, current_user.id, payload.problem_id)
    return service.serialize(db, session)


@router.get("/active", response_model=ActiveInterviewResponse)
def get_active_interview(
    problem_id: UUID = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActiveInterviewResponse:
    session = service.get_active_session(db, current_user.id, problem_id)
    if session is None or session.ended_at is not None:
        return ActiveInterviewResponse(session=None)
    return ActiveInterviewResponse(session=service.serialize(db, session))


@router.get("/{session_id}", response_model=InterviewSessionOut)
def get_interview(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = service.get_session(db, session_id, current_user.id)
    return service.serialize(db, session)


@router.post("/{session_id}/messages", response_model=InterviewSessionOut)
def send_interview_message(
    session_id: UUID,
    payload: InterviewMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = service.add_candidate_message(db, session_id, current_user.id, payload.content)
    return service.serialize(db, session)


@router.post("/{session_id}/hint", response_model=InterviewSessionOut)
def request_interview_hint(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = service.request_hint(db, session_id, current_user.id)
    return service.serialize(db, session)


@router.post("/{session_id}/events", response_model=InterviewSessionOut)
def record_interview_event(
    session_id: UUID,
    payload: InterviewEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = service.record_execution_event(
        db,
        session_id,
        current_user.id,
        event_type=payload.type,
        status=payload.status,
        passed=payload.passed,
        total=payload.total,
        runtime_ms=payload.runtime_ms,
        memory_kb=payload.memory_kb,
    )
    return service.serialize(db, session)


@router.post("/{session_id}/end", response_model=InterviewSessionOut)
def end_interview(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = service.end_session(db, session_id, current_user.id)
    return service.serialize(db, session)
