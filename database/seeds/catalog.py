"""The complete LeetCode-keyed problem catalog.

Three modules contribute specs, all keyed by LeetCode ID and slugged ``lc-{id}``:

* ``microsoft_interview`` - the 47 problems from the Microsoft Interview tracker.
* ``looptracker`` - the 65-problem LoopTracker curriculum, which reuses the Microsoft
  specs where the two overlap.
* ``fang_extra`` - the problems that fill the categories neither tracker covered.
* ``microsoft_extra`` - frequently asked Microsoft problems none of the above include.

Before this module existed, the Microsoft-only problems reached the database solely through
``python -m app.seed_microsoft_interview``, a per-user CLI, so a plain ``python -m app.seed``
left out core problems such as Two Sum and Binary Search. Everything now flows through one
ordered, de-duplicated list.

Order is deliberate and is what the catalog seeder writes as insertion order: the LoopTracker
curriculum first, then the remaining Microsoft problems, then the coverage additions.
The Microsoft Interview list does not follow this order; it groups the whole catalog by
section (see ``microsoft_list``).
"""

from __future__ import annotations

from database.seeds.clear_descriptions import LEADS, describe
from database.seeds.fang_extra import EXTRA_TAGS as FANG_TAGS
from database.seeds.fang_extra import PROBLEMS as FANG_PROBLEMS
from database.seeds.looptracker import PROBLEMS as LOOPTRACKER_PROBLEMS
from database.seeds.looptracker import TAGS as LOOPTRACKER_TAGS
from database.seeds.microsoft_extra import PROBLEMS as MICROSOFT_EXTRA_PROBLEMS
from database.seeds.microsoft_interview import PROBLEMS as MICROSOFT_PROBLEMS

TAGS: list[tuple[str, str]] = list(dict.fromkeys([*LOOPTRACKER_TAGS, *FANG_TAGS]))


def _recommended_modules() -> list:
    """Every ``database.seeds.recommended_*`` module: the problems Grok's review asked for, one file per author."""
    import importlib
    import pkgutil

    from database import seeds as package

    modules = []
    for info in sorted(pkgutil.iter_modules(package.__path__), key=lambda item: item.name):
        if info.name.startswith("recommended_"):
            modules.append(importlib.import_module(f"database.seeds.{info.name}"))
    return modules


def _recommended_problems() -> list[dict]:
    specs: list[dict] = []
    for module in _recommended_modules():
        for spec in module.PROBLEMS:
            # These statements were written plainly from the start: their first paragraph is the opening.
            LEADS.setdefault(spec["leetcode_id"], spec["description"].strip().split("\n\n")[0])
            specs.append(spec)
    return specs


def _build() -> list[dict]:
    ordered: list[dict] = []
    seen: set[int] = set()
    for spec in [*LOOPTRACKER_PROBLEMS, *MICROSOFT_PROBLEMS, *FANG_PROBLEMS, *MICROSOFT_EXTRA_PROBLEMS, *_recommended_problems()]:
        leetcode_id = spec["leetcode_id"]
        if leetcode_id in seen:
            continue
        seen.add(leetcode_id)
        spec = dict(spec)
        spec["description"] = describe(leetcode_id, spec["description"])
        ordered.append(spec)
    return ordered


PROBLEMS: list[dict] = _build()


def validate_catalog() -> None:
    """Fail loudly on the mistakes that are easy to make when editing the seed modules."""
    slugs = [spec["slug"] for spec in PROBLEMS]
    if len(slugs) != len(set(slugs)):
        raise RuntimeError("Catalog has duplicate slugs")

    ids = {spec["leetcode_id"] for spec in PROBLEMS}
    if set(LEADS) != ids:
        missing = sorted(ids - set(LEADS))
        extra = sorted(set(LEADS) - ids)
        raise RuntimeError(f"Clear descriptions missing {missing} extra {extra}")

    tag_slugs = {slug for _, slug in TAGS}
    for spec in PROBLEMS:
        where = f"LeetCode {spec['leetcode_id']} ({spec['title']})"
        if spec["tag"] not in tag_slugs:
            raise RuntimeError(f"{where} uses unknown tag {spec['tag']!r}")
        if not spec["tests"]:
            raise RuntimeError(f"{where} has no test cases")
        if not spec["reference_solution"].strip():
            raise RuntimeError(f"{where} has no reference solution")
        if not spec["time_complexity"] or not spec["space_complexity"]:
            raise RuntimeError(f"{where} is missing a complexity target")
        if len(spec["hints"]) < 2:
            raise RuntimeError(f"{where} needs at least two progressive hints")
        if not spec["function_signature"].get("method_name"):
            raise RuntimeError(f"{where} has no function signature")


validate_catalog()
