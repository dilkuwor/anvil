"""Faded worked examples: the reference solution with more of it blanked at each level.

Backward fading (Renkl): level 1 hides the last block, level 2 the last two, and so on until the
learner writes the whole solution with only the step notes as a guide.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import AppError, NotFoundError
from app.execution.service import run_code
from app.problems.models import Problem, ProblemSolution, ProblemSolutionApproach
from app.problems.schemas import WorkedCheckOut, WorkedExampleOut
from app.problems.service import get_solution
from app.study.models import StudyCompletion
from app.users.models import User

MAX_BLOCK_LINES = 10


@dataclass
class Split:
    header: list[str]
    blocks: list[list[str]]
    footer: list[str]


def split_blocks(code: str) -> Split:
    """Cut a class body into blocks at blank lines; long blocks split again at a shallow line."""
    lines = code.rstrip().splitlines()
    if len(lines) < 3:
        return Split(header=[], blocks=[lines], footer=[])
    # Imports and the class line stay visible at every level; only the body is faded.
    opener = next(
        (i for i, line in enumerate(lines[:-1]) if "class " in line and line.rstrip().endswith("{")),
        0,
    )
    header = lines[: opener + 1]
    footer = [lines[-1]]
    body = lines[opener + 1 : -1]
    # Trim blank lines on either end of the body.
    while body and not body[0].strip():
        body.pop(0)
    while body and not body[-1].strip():
        body.pop()
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in body:
        if not line.strip():
            if current:
                blocks.append(current)
                current = []
            continue
        current.append(line)
    if current:
        blocks.append(current)
    refined: list[list[str]] = []
    for block in blocks:
        refined.extend(_subdivide(block))
    return Split(header=header, blocks=refined or [body], footer=footer)


def _indent(line: str) -> int:
    return len(line) - len(line.lstrip(" \t"))


def _subdivide(block: list[str]) -> list[list[str]]:
    """Split a long block where a line returns to the block's shallowest indentation after deeper lines."""
    if len(block) <= MAX_BLOCK_LINES:
        return [block]
    base = min(_indent(line) for line in block[1:-1]) if len(block) > 2 else _indent(block[0])
    pieces: list[list[str]] = []
    current: list[str] = [block[0]]
    for previous, line in zip(block, block[1:]):
        at_base = _indent(line) == base and not line.lstrip().startswith("}")
        after_nested = _indent(previous) > base or (
            previous.lstrip().startswith("}") and _indent(previous) == base
        )
        starts_new = at_base and len(current) >= 3 and (after_nested or len(current) >= MAX_BLOCK_LINES)
        if starts_new:
            pieces.append(current)
            current = []
        current.append(line)
    if current:
        pieces.append(current)
    return pieces if len(pieces) > 1 else [block]


def _optimal(solution: ProblemSolution) -> ProblemSolutionApproach:
    approaches = sorted(solution.approaches, key=lambda item: item.position)
    if not approaches:
        raise NotFoundError("This solution has no code to practise with yet.")
    return next((item for item in approaches if item.is_optimal), approaches[-1])


def _levels_done(db: Session, user_id: UUID, slug: str) -> int:
    keys = db.scalars(
        select(StudyCompletion.item_key).where(
            StudyCompletion.user_id == user_id, StudyCompletion.item_key.like(f"fade:{slug}:%")
        )
    ).all()
    levels = [int(key.rsplit(":", 1)[1]) for key in keys if key.rsplit(":", 1)[1].isdigit()]
    return max(levels, default=0)


def worked_example(db: Session, user: User, slug: str) -> WorkedExampleOut:
    solution, _ = get_solution(db, slug, user.id)
    approach = _optimal(solution)
    split = split_blocks(approach.code or "")
    if not approach.code or not split.blocks:
        raise NotFoundError("This solution has no code to practise with yet.")
    return WorkedExampleOut(
        approach=approach.name,
        idea=approach.idea,
        steps=[str(item) for item in (approach.steps or [])],
        language=approach.language,
        header="\n".join(split.header),
        blocks=["\n".join(block) for block in split.blocks],
        footer="\n".join(split.footer),
        total_levels=len(split.blocks),
        levels_done=min(_levels_done(db, user.id, slug), len(split.blocks)),
    )


def assemble(split: Split, filled: dict[int, str]) -> str:
    parts = list(split.header)
    for index, block in enumerate(split.blocks):
        if index in filled:
            parts.append(filled[index].rstrip())
        else:
            parts.extend(block)
        parts.append("")
    if parts and parts[-1] == "":
        parts.pop()
    parts.extend(split.footer)
    return "\n".join(parts) + "\n"


def check_level(db: Session, user: User, slug: str, level: int, filled: list[str]) -> WorkedCheckOut:
    """Run the solution with the learner's blocks in place of the last `level` blocks."""
    solution, _ = get_solution(db, slug, user.id)
    approach = _optimal(solution)
    split = split_blocks(approach.code or "")
    total = len(split.blocks)
    if not 1 <= level <= total:
        raise AppError("That level does not exist for this problem.", status_code=400, code="bad_level")
    if len(filled) != level:
        raise AppError(f"Level {level} needs {level} filled block(s).", status_code=400, code="bad_fill")
    if any(not text.strip() for text in filled):
        raise AppError("Fill every blank before checking.", status_code=400, code="bad_fill")
    start = total - level
    source = assemble(split, {start + offset: text for offset, text in enumerate(filled)})
    problem = db.scalar(select(Problem).where(Problem.slug == slug))
    if problem is None:
        raise NotFoundError("Problem not found.")
    result = run_code(db, user, problem.id, source)
    passed = result.status == "ACCEPTED" or (result.total > 0 and result.passed == result.total)
    levels_done = _levels_done(db, user.id, slug)
    if passed and level > levels_done:
        for done in range(levels_done + 1, level + 1):
            db.add(StudyCompletion(user_id=user.id, item_key=f"fade:{slug}:{done}"))
        db.commit()
        levels_done = level
    return WorkedCheckOut(passed=passed, level=level, levels_done=levels_done, total_levels=total, result=result)
