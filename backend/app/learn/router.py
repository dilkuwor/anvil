from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.common.database import get_db
from app.common.deps import get_current_user
from app.learn import service
from app.learn.schemas import (
    LearningCategoryCard,
    LearningCategoryDetail,
    LearningLessonDetail,
    LearningProgressSummary,
    LearningSearchResponse,
    LearningTopicDetail,
    RoadmapLearnLink,
    LessonAskRequest,
    LessonAskResponse,
    LessonTutorRequest,
    TopicAskRequest,
    TopicAskResponse,
)
from app.users.models import User

router = APIRouter(prefix="/api/v1/learn", tags=["learn"])


@router.get("/categories", response_model=list[LearningCategoryCard])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LearningCategoryCard]:
    return service.list_categories(db, current_user.id)


@router.get("/categories/{slug}", response_model=LearningCategoryDetail)
def get_category(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningCategoryDetail:
    return service.get_category(db, current_user.id, slug)


@router.get("/topics/{slug}", response_model=LearningTopicDetail)
def get_topic(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningTopicDetail:
    return service.get_topic(db, current_user.id, slug)


@router.post("/topics/{slug}/ask", response_model=TopicAskResponse)
def ask_about_topic(
    slug: str,
    payload: TopicAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TopicAskResponse:
    answer = service.explain_topic(db, slug, payload.question)
    return TopicAskResponse(topic_slug=slug, answer=answer)


@router.get("/lessons/{slug}", response_model=LearningLessonDetail)
def get_lesson(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningLessonDetail:
    return service.get_lesson(db, current_user.id, slug)


@router.post("/lessons/{slug}/ask", response_model=LessonAskResponse)
def ask_about_lesson(
    slug: str,
    payload: LessonAskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LessonAskResponse:
    answer = service.explain_lesson(db, slug, payload.question, payload.conversation)
    return LessonAskResponse(lesson_slug=slug, answer=answer)


@router.post("/lessons/{lesson_id}/ask-ai")
def ask_lesson_ai(
    lesson_id: UUID,
    payload: LessonTutorRequest,
    stream: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if stream:
        return StreamingResponse(
            service.stream_lesson_tutor(
                db,
                lesson_id=lesson_id,
                question=payload.question,
                conversation=payload.conversation,
            ),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    slug, answer = service.explain_lesson_tutor(
        db,
        lesson_id=lesson_id,
        question=payload.question,
        conversation=payload.conversation,
    )
    return LessonAskResponse(lesson_slug=slug, answer=answer)


@router.get("/search", response_model=LearningSearchResponse)
def search_learn(
    q: str = Query(default="", min_length=0, max_length=80),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningSearchResponse:
    return service.search_learn(db, current_user.id, q)


@router.get("/progress", response_model=LearningProgressSummary)
def get_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningProgressSummary:
    return service.progress_summary(db, current_user.id)


@router.get("/roadmap/{roadmap_key}", response_model=RoadmapLearnLink)
def get_roadmap_learn(
    roadmap_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RoadmapLearnLink:
    return service.roadmap_link(db, current_user.id, roadmap_key)


@router.post("/lessons/{lesson_id}/start", response_model=LearningLessonDetail)
def start_lesson(
    lesson_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningLessonDetail:
    return service.start_lesson(db, current_user.id, lesson_id)


@router.post("/lessons/{lesson_id}/complete", response_model=LearningLessonDetail)
def complete_lesson(
    lesson_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningLessonDetail:
    return service.complete_lesson(db, current_user.id, lesson_id)
