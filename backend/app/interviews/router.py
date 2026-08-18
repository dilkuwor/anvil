from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.interviews import service
from app.interviews import system_design
from app.interviews.scenarios import list_scenarios, public_catalog_item
from app.interviews.schemas import (
    ActiveInterviewResponse,
    ArchitectureUpdateRequest,
    InterviewEventRequest,
    InterviewMessageRequest,
    InterviewSessionOut,
    StartInterviewRequest,
    StartSystemDesignRequest,
    SystemDesignScenarioOut,
)
from app.users.models import User

router = APIRouter(prefix="/api/v1/interviews", tags=["interviews"])


@router.post("/preview", response_model=InterviewSessionOut)
def start_preview_interview(db: Session = Depends(get_db)) -> InterviewSessionOut:
    session = service.start_preview_session(db)
    return service.serialize(db, session)


@router.get("/preview/{session_id}", response_model=InterviewSessionOut)
def get_preview_interview(session_id: UUID, db: Session = Depends(get_db)) -> InterviewSessionOut:
    session = service.get_preview_session(db, session_id)
    return service.serialize(db, session)


@router.post("/preview/{session_id}/messages", response_model=InterviewSessionOut)
def send_preview_interview_message(
    session_id: UUID,
    payload: InterviewMessageRequest,
    db: Session = Depends(get_db),
) -> InterviewSessionOut:
    session = service.add_preview_message(db, session_id, payload.content)
    return service.serialize(db, session)


@router.get("/scenarios", response_model=list[SystemDesignScenarioOut])
def list_system_design_scenarios() -> list[SystemDesignScenarioOut]:
    return [SystemDesignScenarioOut.model_validate(item) for item in list_scenarios()]


@router.get("/scenarios/{slug}", response_model=SystemDesignScenarioOut)
def get_system_design_scenario(slug: str) -> SystemDesignScenarioOut:
    return SystemDesignScenarioOut.model_validate(public_catalog_item(slug))


@router.post("/system-design", response_model=InterviewSessionOut)
def start_system_design_interview(
    payload: StartSystemDesignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = system_design.start_session(db, current_user.id, payload.scenario_slug)
    return service.serialize(db, session)


@router.get("/system-design/active", response_model=ActiveInterviewResponse)
def get_active_system_design_interview(
    scenario_slug: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActiveInterviewResponse:
    session = system_design.get_active_session(db, current_user.id, scenario_slug)
    if session is None or session.ended_at is not None:
        return ActiveInterviewResponse(session=None)
    return ActiveInterviewResponse(session=service.serialize(db, session))


@router.put("/{session_id}/architecture", response_model=InterviewSessionOut)
def update_interview_architecture(
    session_id: UUID,
    payload: ArchitectureUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterviewSessionOut:
    session = service.get_session(db, session_id, current_user.id)
    system_design.raise_if_coding_only(session)
    session = system_design.save_architecture(db, session, payload.architecture)
    return service.serialize(db, session)


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
