from __future__ import annotations

import sys
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.learn.models import LearningCategory, LearningLesson, LearningLessonProblem, LearningTopic
from app.problems.models import Problem

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from database.seeds.learn import CATEGORIES, TOPICS  # noqa: E402


def seed_learning(db: Session) -> tuple[int, int, int]:
    category_ids: dict[str, uuid.UUID] = {}
    for spec in CATEGORIES:
        category = db.scalar(select(LearningCategory).where(LearningCategory.slug == spec["slug"]))
        if category is None:
            category = LearningCategory(id=uuid.uuid4(), slug=spec["slug"])
            db.add(category)
        category.title = spec["title"]
        category.description = spec["description"]
        category.icon = spec["icon"]
        category.display_order = spec["order"]
        category.is_active = True
        db.flush()
        category_ids[spec["slug"]] = category.id

    topic_ids: dict[str, uuid.UUID] = {}
    for spec in TOPICS:
        topic = db.scalar(select(LearningTopic).where(LearningTopic.slug == spec["slug"]))
        if topic is None:
            topic = LearningTopic(id=uuid.uuid4(), slug=spec["slug"])
            db.add(topic)
        topic.category_id = category_ids[spec["category"]]
        topic.title = spec["title"]
        topic.description = spec["description"]
        topic.display_order = spec["order"]
        topic.difficulty = spec["difficulty"]
        topic.estimated_minutes = spec["minutes"]
        topic.roadmap_key = spec.get("roadmap_key")
        topic.practice_tag = spec.get("practice_tag")
        topic.is_active = True
        db.flush()
        topic_ids[spec["slug"]] = topic.id

        seen_lessons: set[str] = set()
        for index, lesson_spec in enumerate(spec["lessons"], start=1):
            seen_lessons.add(lesson_spec["slug"])
            lesson = db.scalar(select(LearningLesson).where(LearningLesson.slug == lesson_spec["slug"]))
            if lesson is None:
                lesson = LearningLesson(id=uuid.uuid4(), slug=lesson_spec["slug"])
                db.add(lesson)
            lesson.topic_id = topic.id
            lesson.title = lesson_spec["title"]
            lesson.short_description = lesson_spec["short"]
            lesson.content = lesson_spec["content"]
            lesson.takeaways = lesson_spec["takeaways"]
            lesson.interview_questions = lesson_spec["questions"]
            lesson.display_order = index
            lesson.estimated_minutes = lesson_spec["minutes"]
            lesson.is_published = True
            db.flush()

            existing_links = db.scalars(
                select(LearningLessonProblem).where(LearningLessonProblem.lesson_id == lesson.id)
            ).all()
            for link in existing_links:
                db.delete(link)
            for order, problem_slug in enumerate(lesson_spec.get("problems") or [], start=1):
                problem = db.scalar(select(Problem).where(Problem.slug == problem_slug))
                if problem is None:
                    continue
                db.add(
                    LearningLessonProblem(
                        id=uuid.uuid4(),
                        lesson_id=lesson.id,
                        problem_id=problem.id,
                        display_order=order,
                    )
                )

    db.flush()
    return len(CATEGORIES), len(TOPICS), sum(len(spec["lessons"]) for spec in TOPICS)
