from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.common.enums import LearningProgressStatus, ProgressStatus
from app.common.errors import NotFoundError, ServiceUnavailableError
from app.interviews import ollama
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
    LessonAskMessage,
    RelatedProblemOut,
    RoadmapLearnLink,
)
from app.problems.models import Problem
from app.progress.models import UserProblemProgress

_TUTOR_SYSTEM = """You are the InterviewAnvil AI interview tutor.

You are helping the candidate understand the current lesson and prepare
for technical interviews.

Use the provided lesson content as your primary source of context.

Explain concepts accurately and practically.

Focus on:
- interview expectations
- engineering tradeoffs
- real-world examples
- common mistakes
- concise technical explanations

Do not blindly agree with the candidate.

If the candidate's reasoning is incorrect, explain why and provide the
correct reasoning.

When appropriate, ask follow-up questions like a technical interviewer.

Do not reveal the full solution to an interview problem unless the user
explicitly asks for it.

Keep answers concise unless the user asks for a detailed explanation.

Start directly with the useful answer. Do not greet the candidate.
Avoid filler such as "Okay, let's talk about...", "Absolutely!", or
"That's a great question!".

Use short headings, bullets, and small code snippets when they help.
Stay easy to scan.

If the previous assistant message asked a question and the user is
answering it, evaluate that answer. Cover:
- What was correct
- What was missing
- How an interviewer would rate it
- A stronger answer
- Exactly one follow-up question

Ask only one interview or quiz question at a time and wait.

If the question is outside this lesson, answer briefly and connect the
explanation back to the current topic when possible."""

_INTENT_INSTRUCTIONS = {
    "explain": (
        "Give a clear explanation of this lesson's concept, then close with one "
        "interview-oriented takeaway."
    ),
    "why": "Explain the engineering and interview relevance of this lesson.",
    "example": "Give one realistic production example tied to this lesson. Be concrete.",
    "tradeoffs": (
        "Give a concise tradeoff comparison for this lesson. Use bullets. "
        "Say when you would choose each option."
    ),
    "interview": (
        "Interactive interview mode. Ask ONE realistic interview question about "
        "this lesson. Do not answer it. Do not greet the candidate. Start with "
        "the question."
    ),
    "evaluate": (
        "The candidate is answering your previous question. Evaluate now using "
        "this structure:\n"
        "- What was correct\n"
        "- What was missing\n"
        "- How an interviewer would rate it\n"
        "- A stronger answer\n"
        "- Exactly one follow-up question\n"
        "Do not dump a list of new questions. Do not greet the candidate."
    ),
    "quiz": (
        "Quiz mode. Ask ONE question at a time about this lesson and wait. "
        "Do not reveal the answer. Do not greet the candidate. Start with the question."
    ),
    "interview_question": (
        "Ask one realistic interview question from this lesson. Do not reveal "
        "the answer unless they explicitly ask for it."
    ),
    "mistakes": (
        "List the common mistakes for this lesson. For each one, say why it "
        "hurts in an interview or in production."
    ),
    "beginner": (
        "Explain this as if the candidate is new to the topic. Stay technically "
        "correct. Use a simple analogy, then the precise definition."
    ),
    "production": (
        "Explain how this works in a production system: architecture, failure "
        "modes, and tradeoffs. Stay tied to this lesson."
    ),
    "general": (
        "Answer using this lesson as the primary source. If the question is "
        "outside the lesson, answer briefly and connect it back."
    ),
}


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


def explain_topic(db: Session, slug: str, question: str | None = None) -> str:
    topic = _topic_by_slug(db, slug)
    lessons = [
        lesson
        for lesson in sorted(topic.lessons, key=lambda item: (item.display_order, item.title))
        if lesson.is_published
    ]
    outline = "\n".join(f"- {lesson.title}: {lesson.short_description}" for lesson in lessons) or "- (no lessons yet)"
    asked = (question or "").strip()
    if asked:
        user_turn = f"The learner asked:\n{asked}\n\nAnswer in the context of this topic only."
    else:
        user_turn = (
            "Explain this topic for an interview candidate. Cover:\n"
            "1. The core concept in plain language.\n"
            "2. Why it shows up in interviews.\n"
            "3. Concrete use cases and when to apply it.\n"
            "Keep it concise (under 250 words). Use short headings."
        )
    system = (
        "You are an InterviewAnvil tutor sitting next to a software engineer preparing for interviews. "
        "Explain clearly. Do not write full solution code. Do not invent hidden test cases. "
        "Stay on this topic.\n\n"
        f"Category: {topic.category.title}\n"
        f"Topic: {topic.title} ({topic.difficulty})\n"
        f"Description: {topic.description}\n"
        f"Lessons in this topic:\n{outline}"
    )
    try:
        return ollama.tutor_reply(system, user_turn)
    except Exception:
        if asked:
            return (
                f"{topic.title} is part of {topic.category.title}. {topic.description} "
                "Open a lesson on this page for the structured explanation, then try Ask AI again in a moment."
            )
        cases = "; ".join(lesson.title for lesson in lessons[:4]) or "the lessons listed here"
        return (
            f"## {topic.title}\n\n{topic.description}\n\n"
            f"## Use cases\n\nYou will see this in interviews around {cases}. "
            "Work through the lessons on this page for examples, tradeoffs, and interview questions."
        )


def explain_lesson(
    db: Session,
    slug: str,
    question: str | None = None,
    conversation: list[LessonAskMessage] | None = None,
) -> str:
    try:
        prepared = _prepare_lesson_tutor(db, slug=slug, question=question, conversation=conversation)
        return ollama.tutor_reply(prepared.system, prepared.user_turn, conversation=prepared.history)
    except (ServiceUnavailableError, NotFoundError):
        raise
    except Exception:
        lesson = _lesson_by_slug(db, slug)
        asked = (question or "").strip()
        if asked:
            return (
                f"{lesson.title} sits under {lesson.topic.title}. {lesson.short_description} "
                "Try Ask AI again in a moment, or use the takeaways on this page."
            )
        return (
            f"## {lesson.title}\n\n{lesson.short_description}\n\n"
            "## Use cases\n\n"
            "Use this concept when an interviewer asks you to size a system, defend a tradeoff, "
            "or walk through how you would apply it on the job. The lesson body on this page has the details."
        )


def explain_lesson_tutor(
    db: Session,
    *,
    lesson_id: UUID | None = None,
    slug: str | None = None,
    question: str,
    conversation: list[LessonAskMessage] | None = None,
) -> tuple[str, str]:
    prepared = _prepare_lesson_tutor(db, lesson_id=lesson_id, slug=slug, question=question, conversation=conversation)
    try:
        answer = ollama.tutor_reply(prepared.system, prepared.user_turn, conversation=prepared.history)
    except Exception as exc:
        raise ServiceUnavailableError() from exc
    return prepared.lesson_slug, answer


def stream_lesson_tutor(
    db: Session,
    *,
    lesson_id: UUID | None = None,
    slug: str | None = None,
    question: str,
    conversation: list[LessonAskMessage] | None = None,
):
    prepared = _prepare_lesson_tutor(db, lesson_id=lesson_id, slug=slug, question=question, conversation=conversation)

    def events():
        try:
            for delta in ollama.tutor_reply_stream(
                prepared.system, prepared.user_turn, conversation=prepared.history
            ):
                yield f"data: {json.dumps({'delta': delta})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'AI tutor is temporarily unavailable. Please try again.'})}\n\n"

    return events()


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


@dataclass
class _PreparedTutor:
    lesson_slug: str
    system: str
    user_turn: str
    history: list[dict[str, str]]


def _prepare_lesson_tutor(
    db: Session,
    *,
    lesson_id: UUID | None = None,
    slug: str | None = None,
    question: str | None = None,
    conversation: list[LessonAskMessage] | None = None,
) -> _PreparedTutor:
    lesson = _lesson_by_id(db, lesson_id) if lesson_id is not None else _lesson_by_slug(db, slug or "")
    topic = lesson.topic
    asked = (question or "").strip()
    history = [
        {"role": item.role, "content": item.content.strip()}
        for item in (conversation or [])
        if item.content.strip()
    ][-12:]
    intent = _detect_intent(asked, history)
    context = _lesson_tutor_context(lesson, topic)
    system = f"{_TUTOR_SYSTEM}\n\nCurrent lesson context:\n{context}"
    if asked:
        user_turn = (
            f"The candidate asked:\n{asked}\n\n"
            f"Detected intent: {intent}\n"
            f"{_INTENT_INSTRUCTIONS.get(intent, _INTENT_INSTRUCTIONS['general'])}"
        )
    else:
        user_turn = (
            "Explain this lesson for an interview candidate. Cover:\n"
            "1. The core concept in plain language.\n"
            "2. Why it shows up in interviews.\n"
            "3. One concrete example.\n"
            "4. One interview-style takeaway.\n"
            "Keep it concise. Use short headings. Do not greet the candidate."
        )
    return _PreparedTutor(lesson_slug=lesson.slug, system=system, user_turn=user_turn, history=history)


def _lesson_by_id(db: Session, lesson_id: UUID) -> LearningLesson:
    lesson = db.scalar(
        select(LearningLesson)
        .options(selectinload(LearningLesson.topic).selectinload(LearningTopic.category))
        .where(LearningLesson.id == lesson_id, LearningLesson.is_published.is_(True))
    )
    if lesson is None:
        raise NotFoundError("Lesson not found.")
    return lesson


def _lesson_tutor_context(lesson: LearningLesson, topic: LearningTopic) -> str:
    sections = _parse_lesson_sections(lesson.content or "")
    takeaways = "\n".join(f"- {item}" for item in (lesson.takeaways or [])[:8]) or "- (none)"
    questions = "\n".join(f"- {item}" for item in (lesson.interview_questions or [])[:8]) or "- (none)"
    concept = sections.get("concept") or lesson.short_description
    body = (lesson.content or "").strip()
    if len(body) > 4000:
        body = body[:3997] + "…"
    return (
        f"Category: {topic.category.title}\n"
        f"Topic: {topic.title}\n"
        f"Lesson title: {lesson.title}\n"
        f"Lesson summary/concept: {concept}\n"
        f"Why it matters: {sections.get('why') or '(see lesson notes)'}\n"
        f"How it works: {sections.get('how') or '(see lesson notes)'}\n"
        f"Examples: {sections.get('example') or sections.get('uses') or '(see lesson notes)'}\n"
        f"Tradeoffs: {sections.get('tradeoffs') or '(see lesson notes)'}\n"
        f"Common mistakes: {sections.get('mistakes') or '(see lesson notes)'}\n"
        f"Interview tips: {sections.get('tip') or '(see lesson notes)'}\n"
        f"Key takeaways:\n{takeaways}\n"
        f"Interview questions:\n{questions}\n\n"
        f"Full lesson notes:\n{body}"
    )


def _parse_lesson_sections(content: str) -> dict[str, str]:
    aliases = {
        "why it matters": "why",
        "how it works": "how",
        "example": "example",
        "examples": "example",
        "common use cases": "uses",
        "use cases": "uses",
        "tradeoffs": "tradeoffs",
        "trade-offs": "tradeoffs",
        "common mistakes": "mistakes",
        "interview tip": "tip",
        "interview tips": "tip",
    }
    parts = re.split(r"\n(?=## )", content.strip())
    sections: dict[str, str] = {}
    if parts:
        intro = parts[0]
        if intro.startswith("# "):
            intro = intro.split("\n", 1)[1] if "\n" in intro else ""
        intro = intro.strip()
        if intro and not intro.startswith("## "):
            sections["concept"] = intro
    for part in parts[1:]:
        heading, _, body = part.partition("\n")
        key = aliases.get(heading.replace("#", "").strip().lower())
        if key:
            sections[key] = body.strip()
    return sections


def _detect_intent(question: str, history: list[dict[str, str]]) -> str:
    text = question.lower()
    command = _command_intent(text)
    last_assistant = next((item.get("content", "") for item in reversed(history) if item.get("role") == "assistant"), "")
    if command is None and last_assistant and "?" in last_assistant:
        return "evaluate"
    return command or "general"


def _command_intent(text: str) -> str | None:
    if re.search(r"\bquiz me\b|\btest me\b", text):
        return "quiz"
    if re.search(r"\binterview me\b", text):
        return "interview"
    if re.search(r"interview question", text):
        return "interview_question"
    if re.search(r"trade-?offs?", text):
        return "tradeoffs"
    if re.search(r"common mistakes|what to avoid", text):
        return "mistakes"
    if re.search(r"\bexample\b|real[- ]world", text):
        return "example"
    if re.search(r"why (does |do |is |this )?matter|why it matters", text):
        return "why"
    if re.search(r"beginner|eli5|like i.?m (a )?new|simplify", text):
        return "beginner"
    if re.search(r"production|real system|in a real", text):
        return "production"
    if re.search(r"\bexplain\b", text):
        return "explain"
    if re.search(r"\bquiz\b", text):
        return "quiz"
    return None


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
