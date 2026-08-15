from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.common.enums import LearningProgressStatus, ProgressStatus
from app.common.errors import NotFoundError
from app.learn.models import (
    LearningCategory,
    LearningLesson,
    LearningLessonProblem,
    LearningTopic,
    UserLearningProgress,
)
from app.learn.schemas import (
    LearningCategoryCard,
    LearningCategoryDetail,
    LearningLessonDetail,
    LearningLessonSummary,
    LearningProgressSummary,
    LearningSearchHit,
    LearningSearchResponse,
    LearningTopicDetail,
    LearningTopicSummary,
    RelatedProblemOut,
    RoadmapLearnLink,
)
from app.problems.models import Problem
from app.progress.models import UserProblemProgress


def list_categories(db: Session, user_id: UUID) -> list[LearningCategoryCard]:
    categories = db.scalars(
        select(LearningCategory)
        .where(LearningCategory.is_active.is_(True))
        .order_by(LearningCategory.display_order, LearningCategory.title)
    ).all()
    completed = _completed_by_category(db, user_id)
    counts = _catalog_counts(db)
    return [_category_card(category, counts, completed) for category in categories]


def get_category(db: Session, user_id: UUID, slug: str) -> LearningCategoryDetail:
    category = db.scalar(select(LearningCategory).where(LearningCategory.slug == slug, LearningCategory.is_active.is_(True)))
    if category is None:
        raise NotFoundError("Learning category not found.")
    topics = db.scalars(
        select(LearningTopic)
        .where(LearningTopic.category_id == category.id, LearningTopic.is_active.is_(True))
        .order_by(LearningTopic.display_order, LearningTopic.title)
    ).all()
    progress = _progress_map(db, user_id)
    lesson_rows = _lessons_by_topic(db, [topic.id for topic in topics])
    topic_summaries = [_topic_summary(category, topic, lesson_rows.get(topic.id, []), progress) for topic in topics]
    lesson_count = sum(item.lesson_count for item in topic_summaries)
    completed = sum(item.completed_lessons for item in topic_summaries)
    return LearningCategoryDetail(
        id=category.id,
        slug=category.slug,
        title=category.title,
        description=category.description,
        icon=category.icon,
        lesson_count=lesson_count,
        completed_lessons=completed,
        percent=_percent(completed, lesson_count),
        topics=topic_summaries,
    )


def get_topic(db: Session, user_id: UUID, slug: str) -> LearningTopicDetail:
    topic = _topic_by_slug(db, slug)
    lessons = [
        lesson
        for lesson in sorted(topic.lessons, key=lambda item: (item.display_order, item.title))
        if lesson.is_published
    ]
    progress = _progress_map(db, user_id)
    problem_status = _problem_status_map(db, user_id)
    related = _related_problems_for_lessons(db, [lesson.id for lesson in lessons], problem_status)
    summaries = [_lesson_summary(topic.category, topic, lesson, progress) for lesson in lessons]
    completed = sum(1 for item in summaries if item.status == LearningProgressStatus.COMPLETED.value)
    return LearningTopicDetail(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        description=topic.description,
        difficulty=topic.difficulty,
        estimated_minutes=topic.estimated_minutes,
        category_slug=topic.category.slug,
        category_title=topic.category.title,
        lesson_count=len(summaries),
        completed_lessons=completed,
        percent=_percent(completed, len(summaries)),
        status=_topic_status(completed, len(summaries), summaries),
        lessons=summaries,
        related_problems=related,
        practice_tag=_practice_tag(topic),
    )


def get_lesson(db: Session, user_id: UUID, slug: str) -> LearningLessonDetail:
    lesson = _lesson_by_slug(db, slug)
    _touch_progress(db, user_id, lesson.id)
    db.commit()
    progress = _progress_map(db, user_id)
    topic = lesson.topic
    siblings = [item for item in sorted(topic.lessons, key=lambda row: (row.display_order, row.title)) if item.is_published]
    index = next((i for i, item in enumerate(siblings) if item.id == lesson.id), 0)
    previous = siblings[index - 1] if index > 0 else None
    nxt = siblings[index + 1] if index + 1 < len(siblings) else None
    problem_status = _problem_status_map(db, user_id)
    related = _related_problems_for_lessons(db, [lesson.id], problem_status)
    return LearningLessonDetail(
        id=lesson.id,
        slug=lesson.slug,
        title=lesson.title,
        short_description=lesson.short_description,
        content=lesson.content,
        takeaways=list(lesson.takeaways or []),
        interview_questions=list(lesson.interview_questions or []),
        estimated_minutes=lesson.estimated_minutes,
        status=progress.get(lesson.id, LearningProgressStatus.IN_PROGRESS.value),
        category_slug=topic.category.slug,
        category_title=topic.category.title,
        topic_slug=topic.slug,
        topic_title=topic.title,
        previous=_lesson_summary(topic.category, topic, previous, progress) if previous else None,
        next=_lesson_summary(topic.category, topic, nxt, progress) if nxt else None,
        related_problems=related,
    )


def start_lesson(db: Session, user_id: UUID, lesson_id: UUID) -> LearningLessonDetail:
    lesson = db.get(LearningLesson, lesson_id)
    if lesson is None or not lesson.is_published:
        raise NotFoundError("Lesson not found.")
    _touch_progress(db, user_id, lesson.id)
    db.commit()
    return get_lesson(db, user_id, lesson.slug)


def complete_lesson(db: Session, user_id: UUID, lesson_id: UUID) -> LearningLessonDetail:
    lesson = db.get(LearningLesson, lesson_id)
    if lesson is None or not lesson.is_published:
        raise NotFoundError("Lesson not found.")
    row = _touch_progress(db, user_id, lesson.id)
    now = _now()
    row.status = LearningProgressStatus.COMPLETED.value
    row.progress_percent = 100
    row.completed_at = now
    row.last_accessed_at = now
    db.commit()
    return get_lesson(db, user_id, lesson.slug)


def search_learn(db: Session, user_id: UUID, query: str) -> LearningSearchResponse:
    term = query.strip()
    if len(term) < 2:
        return LearningSearchResponse(query=term, items=[])
    like = f"%{term}%"
    items: list[LearningSearchHit] = []

    for category in db.scalars(
        select(LearningCategory)
        .where(LearningCategory.is_active.is_(True), or_(LearningCategory.title.ilike(like), LearningCategory.description.ilike(like)))
        .limit(5)
    ):
        items.append(
            LearningSearchHit(type="category", title=category.title, subtitle="Category", href=f"/learn/{category.slug}")
        )

    topics = db.scalars(
        select(LearningTopic)
        .options(selectinload(LearningTopic.category))
        .where(
            LearningTopic.is_active.is_(True),
            or_(LearningTopic.title.ilike(like), LearningTopic.description.ilike(like), LearningTopic.slug.ilike(like)),
        )
        .limit(8)
    )
    for topic in topics:
        items.append(
            LearningSearchHit(
                type="topic",
                title=topic.title,
                subtitle=topic.category.title,
                href=f"/learn/{topic.category.slug}/{topic.slug}",
                difficulty=topic.difficulty,
            )
        )

    lessons = list(
        db.scalars(
            select(LearningLesson)
            .options(selectinload(LearningLesson.topic).selectinload(LearningTopic.category))
            .where(
                LearningLesson.is_published.is_(True),
                or_(
                    LearningLesson.title.ilike(like),
                    LearningLesson.short_description.ilike(like),
                    LearningLesson.slug.ilike(like),
                ),
            )
            .limit(8)
        )
    )
    if len(lessons) < 6:
        extra_query = select(LearningLesson).options(
            selectinload(LearningLesson.topic).selectinload(LearningTopic.category)
        ).where(LearningLesson.is_published.is_(True), LearningLesson.content.ilike(like))
        if lessons:
            extra_query = extra_query.where(LearningLesson.id.notin_([lesson.id for lesson in lessons]))
        lessons.extend(db.scalars(extra_query.limit(6)))
    lesson_ids = []
    for lesson in lessons:
        lesson_ids.append(lesson.id)
        items.append(
            LearningSearchHit(
                type="lesson",
                title=lesson.title,
                subtitle=f"{lesson.topic.category.title} · {lesson.topic.title}",
                href=f"/learn/{lesson.topic.category.slug}/{lesson.topic.slug}/{lesson.slug}",
            )
        )

    seen_problems: set[str] = set()
    problems = list(
        db.scalars(
            select(Problem)
            .where(Problem.is_active.is_(True), or_(Problem.title.ilike(like), Problem.slug.ilike(like)))
            .limit(6)
        )
    )
    if lesson_ids:
        linked = _related_problems_for_lessons(db, lesson_ids, {})
        for item in linked:
            if item.slug in seen_problems:
                continue
            seen_problems.add(item.slug)
            items.append(
                LearningSearchHit(
                    type="problem",
                    title=item.title,
                    subtitle="Related problem",
                    href=f"/problems/{item.slug}",
                    difficulty=item.difficulty,
                )
            )
    for problem in problems:
        if problem.slug in seen_problems:
            continue
        seen_problems.add(problem.slug)
        items.append(
            LearningSearchHit(
                type="problem",
                title=problem.title,
                subtitle="Practice problem",
                href=f"/problems/{problem.slug}",
                difficulty=problem.difficulty,
            )
        )
    return LearningSearchResponse(query=term, items=items[:20])


def progress_summary(db: Session, user_id: UUID) -> LearningProgressSummary:
    cards = list_categories(db, user_id)
    total = sum(card.lesson_count for card in cards)
    completed = sum(card.completed_lessons for card in cards)
    in_progress = db.scalar(
        select(func.count())
        .select_from(UserLearningProgress)
        .where(
            UserLearningProgress.user_id == user_id,
            UserLearningProgress.status == LearningProgressStatus.IN_PROGRESS.value,
        )
    ) or 0
    return LearningProgressSummary(
        completed_lessons=completed,
        in_progress_lessons=int(in_progress),
        total_lessons=total,
        percent=_percent(completed, total),
        categories=cards,
    )


def roadmap_link(db: Session, user_id: UUID, roadmap_key: str) -> RoadmapLearnLink:
    topic = db.scalar(
        select(LearningTopic)
        .options(selectinload(LearningTopic.category), selectinload(LearningTopic.lessons))
        .where(LearningTopic.roadmap_key == roadmap_key, LearningTopic.is_active.is_(True))
    )
    if topic is None:
        return RoadmapLearnLink()
    progress = _progress_map(db, user_id)
    lessons = [lesson for lesson in topic.lessons if lesson.is_published]
    problem_status = _problem_status_map(db, user_id)
    related = _related_problems_for_lessons(db, [lesson.id for lesson in lessons], problem_status)
    mock = related[0].slug if related else None
    return RoadmapLearnLink(
        topic=_topic_summary(topic.category, topic, lessons, progress),
        practice_tag=_practice_tag(topic),
        mock_problem_slug=mock,
    )


def _topic_by_slug(db: Session, slug: str) -> LearningTopic:
    topic = db.scalar(
        select(LearningTopic)
        .options(selectinload(LearningTopic.category), selectinload(LearningTopic.lessons))
        .where(LearningTopic.slug == slug, LearningTopic.is_active.is_(True))
    )
    if topic is None:
        raise NotFoundError("Learning topic not found.")
    return topic


def _lesson_by_slug(db: Session, slug: str) -> LearningLesson:
    lesson = db.scalar(
        select(LearningLesson)
        .options(selectinload(LearningLesson.topic).selectinload(LearningTopic.category))
        .where(LearningLesson.slug == slug, LearningLesson.is_published.is_(True))
    )
    if lesson is None:
        raise NotFoundError("Lesson not found.")
    return lesson


def _touch_progress(db: Session, user_id: UUID, lesson_id: UUID) -> UserLearningProgress:
    row = db.scalar(
        select(UserLearningProgress).where(
            UserLearningProgress.user_id == user_id,
            UserLearningProgress.lesson_id == lesson_id,
        )
    )
    now = _now()
    if row is None:
        row = UserLearningProgress(
            user_id=user_id,
            lesson_id=lesson_id,
            status=LearningProgressStatus.IN_PROGRESS.value,
            progress_percent=20,
            started_at=now,
            last_accessed_at=now,
        )
        db.add(row)
        return row
    row.last_accessed_at = now
    if row.status == LearningProgressStatus.NOT_STARTED.value:
        row.status = LearningProgressStatus.IN_PROGRESS.value
        row.progress_percent = max(row.progress_percent, 20)
        row.started_at = row.started_at or now
    return row


def _progress_map(db: Session, user_id: UUID) -> dict[UUID, str]:
    rows = db.scalars(select(UserLearningProgress).where(UserLearningProgress.user_id == user_id)).all()
    return {row.lesson_id: row.status for row in rows}


def _problem_status_map(db: Session, user_id: UUID) -> dict[UUID, str]:
    rows = db.scalars(select(UserProblemProgress).where(UserProblemProgress.user_id == user_id)).all()
    return {row.problem_id: row.status for row in rows}


def _catalog_counts(db: Session) -> dict[UUID, tuple[int, int]]:
    topic_counts = dict(
        db.execute(
            select(LearningTopic.category_id, func.count())
            .where(LearningTopic.is_active.is_(True))
            .group_by(LearningTopic.category_id)
        ).all()
    )
    lesson_counts = dict(
        db.execute(
            select(LearningTopic.category_id, func.count())
            .join(LearningLesson, LearningLesson.topic_id == LearningTopic.id)
            .where(LearningTopic.is_active.is_(True), LearningLesson.is_published.is_(True))
            .group_by(LearningTopic.category_id)
        ).all()
    )
    keys = set(topic_counts) | set(lesson_counts)
    return {key: (int(topic_counts.get(key, 0)), int(lesson_counts.get(key, 0))) for key in keys}


def _completed_by_category(db: Session, user_id: UUID) -> dict[UUID, int]:
    rows = db.execute(
        select(LearningTopic.category_id, func.count())
        .join(LearningLesson, LearningLesson.topic_id == LearningTopic.id)
        .join(UserLearningProgress, UserLearningProgress.lesson_id == LearningLesson.id)
        .where(
            UserLearningProgress.user_id == user_id,
            UserLearningProgress.status == LearningProgressStatus.COMPLETED.value,
            LearningLesson.is_published.is_(True),
        )
        .group_by(LearningTopic.category_id)
    ).all()
    return {category_id: int(count) for category_id, count in rows}


def _lessons_by_topic(db: Session, topic_ids: list[UUID]) -> dict[UUID, list[LearningLesson]]:
    if not topic_ids:
        return {}
    lessons = db.scalars(
        select(LearningLesson).where(LearningLesson.topic_id.in_(topic_ids), LearningLesson.is_published.is_(True))
    ).all()
    grouped: dict[UUID, list[LearningLesson]] = {}
    for lesson in lessons:
        grouped.setdefault(lesson.topic_id, []).append(lesson)
    return grouped


def _related_problems_for_lessons(
    db: Session, lesson_ids: list[UUID], problem_status: dict[UUID, str]
) -> list[RelatedProblemOut]:
    if not lesson_ids:
        return []
    links = db.scalars(
        select(LearningLessonProblem)
        .options(selectinload(LearningLessonProblem.problem))
        .where(LearningLessonProblem.lesson_id.in_(lesson_ids))
        .order_by(LearningLessonProblem.display_order)
    ).all()
    seen: set[UUID] = set()
    out: list[RelatedProblemOut] = []
    for link in links:
        problem = link.problem
        if problem is None or problem.id in seen or not problem.is_active:
            continue
        seen.add(problem.id)
        out.append(
            RelatedProblemOut(
                id=problem.id,
                title=problem.title,
                slug=problem.slug,
                difficulty=problem.difficulty,
                status=problem_status.get(problem.id, ProgressStatus.NOT_STARTED.value),
            )
        )
    return out


def _category_card(
    category: LearningCategory,
    counts: dict[UUID, tuple[int, int]],
    completed: dict[UUID, int],
) -> LearningCategoryCard:
    topic_count, lesson_count = counts.get(category.id, (0, 0))
    return LearningCategoryCard(
        id=category.id,
        slug=category.slug,
        title=category.title,
        description=category.description,
        icon=category.icon,
        display_order=category.display_order,
        topic_count=topic_count,
        lesson_count=lesson_count,
        completed_lessons=completed.get(category.id, 0),
    )


def _topic_summary(
    category: LearningCategory,
    topic: LearningTopic,
    lessons: list[LearningLesson],
    progress: dict[UUID, str],
) -> LearningTopicSummary:
    completed = sum(1 for lesson in lessons if progress.get(lesson.id) == LearningProgressStatus.COMPLETED.value)
    summaries = [_lesson_summary(category, topic, lesson, progress) for lesson in lessons]
    return LearningTopicSummary(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        description=topic.description,
        difficulty=topic.difficulty,
        estimated_minutes=topic.estimated_minutes,
        lesson_count=len(lessons),
        completed_lessons=completed,
        percent=_percent(completed, len(lessons)),
        status=_topic_status(completed, len(lessons), summaries),
        href=f"/learn/{category.slug}/{topic.slug}",
    )


def _lesson_summary(
    category: LearningCategory,
    topic: LearningTopic,
    lesson: LearningLesson,
    progress: dict[UUID, str],
) -> LearningLessonSummary:
    return LearningLessonSummary(
        id=lesson.id,
        slug=lesson.slug,
        title=lesson.title,
        short_description=lesson.short_description,
        estimated_minutes=lesson.estimated_minutes,
        status=progress.get(lesson.id, LearningProgressStatus.NOT_STARTED.value),
        href=f"/learn/{category.slug}/{topic.slug}/{lesson.slug}",
    )


def _topic_status(completed: int, total: int, lessons: list[LearningLessonSummary]) -> str:
    if total and completed >= total:
        return LearningProgressStatus.COMPLETED.value
    if completed or any(item.status == LearningProgressStatus.IN_PROGRESS.value for item in lessons):
        return LearningProgressStatus.IN_PROGRESS.value
    return LearningProgressStatus.NOT_STARTED.value


def _practice_tag(topic: LearningTopic) -> str | None:
    return topic.practice_tag or topic.roadmap_key


def _percent(completed: int, total: int) -> int:
    if total <= 0:
        return 0
    return round(100 * completed / total)


def _now() -> datetime:
    return datetime.now(timezone.utc)
