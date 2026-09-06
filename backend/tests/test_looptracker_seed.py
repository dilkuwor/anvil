from sqlalchemy import func, select

from app.problems.models import Problem, Tag
from app.problems.seed_looptracker import seed_looptracker_problems, validate_catalog
from database.seeds.looptracker import LOOPTRACKER_IDS, PROBLEMS, leetcode_slug


def test_catalog_matches_problems_md():
    validate_catalog()
    ids = [spec["leetcode_id"] for spec in PROBLEMS]
    assert ids == LOOPTRACKER_IDS
    assert len(ids) == 65
    assert len({spec["slug"] for spec in PROBLEMS}) == 65
    assert {spec["slug"] for spec in PROBLEMS} == {leetcode_slug(i) for i in LOOPTRACKER_IDS}


def test_seed_inserts_missing_problems_and_is_idempotent(db):
    created, existed = seed_looptracker_problems(db)
    db.commit()
    assert created == 65
    assert existed == 0
    assert db.scalar(select(func.count()).select_from(Problem).where(Problem.slug.like("lc-%"))) == 65
    assert db.scalar(select(Problem).where(Problem.slug == "lc-1143")).title == "Longest Common Subsequence"
    assert db.scalar(select(func.count()).select_from(Tag).where(Tag.slug == "heap")) == 1

    again_created, again_existed = seed_looptracker_problems(db)
    db.commit()
    assert again_created == 0
    assert again_existed == 65
    assert db.scalar(select(func.count()).select_from(Problem).where(Problem.slug.like("lc-%"))) == 65
