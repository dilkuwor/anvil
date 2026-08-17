from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, func, select

from app.lists.models import ProblemList, ProblemListItem
from app.lists.seed_microsoft import seed_microsoft_interview_problems
from app.problems.models import Problem, Tag, TestCase
from app.users.models import User
from database.seeds.microsoft_interview import EXPECTED_LEETCODE_IDS, PROBLEMS, leetcode_slug


def _user(db) -> User:
    user = User(
        email="ms-seed@example.com",
        username="msseed",
        password_hash="not-used",
    )
    db.add(user)
    db.commit()
    return user


def test_catalog_has_exactly_47_unique_ids():
    ids = [spec["leetcode_id"] for spec in PROBLEMS]
    assert len(ids) == 47
    assert len(set(ids)) == 47
    assert ids == EXPECTED_LEETCODE_IDS
    assert 124 in ids
    assert 207 in ids


def test_seed_creates_problems_list_and_order(db):
    user = _user(db)
    report = seed_microsoft_interview_problems(db, user.id)
    db.commit()

    assert report.created_problems == 47
    assert report.existing_problems == 0
    assert report.added_memberships == 47
    assert report.existing_memberships == 0
    assert report.duplicates_created == 0
    assert report.found == 47
    assert report.order_verified is True

    owned = db.scalar(select(ProblemList).where(ProblemList.user_id == user.id))
    items = db.scalars(select(ProblemListItem).where(ProblemListItem.list_id == owned.id)).all()
    by_id = {problem.id: problem for problem in db.scalars(select(Problem)).all()}
    slugs = [by_id[item.problem_id].slug for item in sorted(items, key=lambda row: row.created_at)]
    assert slugs == [leetcode_slug(leetcode_id) for leetcode_id in EXPECTED_LEETCODE_IDS]
    assert db.scalar(select(func.count()).select_from(Problem).where(Problem.slug.like("lc-%"))) == 47
    assert db.scalar(select(func.count()).select_from(Tag).where(Tag.slug == "sliding-window")) == 1


def test_seed_is_idempotent_and_does_not_overwrite(db):
    user = _user(db)
    first = seed_microsoft_interview_problems(db, user.id)
    db.commit()

    problem = db.scalar(select(Problem).where(Problem.slug == "lc-3"))
    problem.title = "LeetCode #3 — custom title"
    problem.description = "user-edited statement"
    db.execute(delete(TestCase).where(TestCase.problem_id == problem.id))
    db.commit()

    second = seed_microsoft_interview_problems(db, user.id)
    db.commit()

    assert second.created_problems == 0
    assert second.existing_problems == 47
    assert second.added_memberships == 0
    assert second.existing_memberships == 47
    assert second.duplicates_created == 0
    assert second.order_verified is True
    assert db.scalar(select(func.count()).select_from(ProblemList).where(ProblemList.user_id == user.id)) == 1
    assert db.scalar(select(func.count()).select_from(Problem).where(Problem.slug == "lc-3")) == 1

    refreshed = db.scalar(select(Problem).where(Problem.slug == "lc-3"))
    assert refreshed.title == "LeetCode #3 — custom title"
    assert refreshed.description == "user-edited statement"
    assert db.scalar(select(func.count()).select_from(TestCase).where(TestCase.problem_id == refreshed.id)) == 0


def test_seed_reuses_existing_leetcode_title_and_preserves_extra_items(db):
    user = _user(db)
    preexisting = Problem(
        id=uuid4(),
        title="Two Sum",
        slug="two-sum-original",
        description="already in catalog",
        difficulty="EASY",
        starter_code="class Solution {}",
        is_active=True,
    )
    extra = Problem(
        id=uuid4(),
        title="Unrelated Extra",
        slug="unrelated-extra",
        description="keep me",
        difficulty="EASY",
        starter_code="class Solution {}",
        is_active=True,
    )
    db.add_all([preexisting, extra])
    owned = ProblemList(user_id=user.id, name="Microsoft Interview", description="mine")
    db.add(owned)
    db.flush()
    db.add(
        ProblemListItem(
            list_id=owned.id,
            problem_id=extra.id,
            created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
    )
    db.commit()

    report = seed_microsoft_interview_problems(db, user.id)
    db.commit()

    assert report.created_problems == 46
    assert report.existing_problems == 1
    assert report.added_memberships == 47
    assert report.extra_list_items == 1
    assert db.scalar(select(Problem).where(Problem.slug == "lc-1")) is None
    reused = db.scalar(select(Problem).where(Problem.slug == "two-sum-original"))
    assert reused.description == "already in catalog"

    items = db.scalars(select(ProblemListItem).where(ProblemListItem.list_id == owned.id)).all()
    assert len(items) == 48
    ordered = [item.problem.slug for item in sorted(items, key=lambda row: row.created_at)]
    assert ordered[0] == "lc-3"
    assert "two-sum-original" in ordered
    assert ordered[-1] == "unrelated-extra"
