"""Knowledge-check questions, keyed by lesson slug.

Each lesson has a pool of 3 to 24 questions. A lesson round serves 8 of them at random, unseen ones first,
so the same lesson asks different questions each time; answering 8 distinct questions correctly earns
"Checked", and answered questions return through spaced review. The pool should cover every section and
the decisions the lesson teaches (which database, which algorithm, A vs B, capacity numbers). Kinds:

- ``choice``        one correct option
- ``spot_mistake``  a realistic wrong claim or design; pick what is wrong with it
- ``short_answer``  the learner answers in their own words, then compares with ``model_answer``

``section`` is the heading id the question comes from (the lowercased h2 with hyphens), so a
miss links straight back to the right part of the lesson. ``concept`` groups questions that
test the same idea; ``mistake`` names the misconception a wrong answer reveals.
"""

from __future__ import annotations

KINDS = {"choice", "spot_mistake", "short_answer"}
MIN_PER_LESSON = 3
MAX_PER_LESSON = 24

CHECKS: dict[str, list[dict]] = {}


def _load_modules() -> None:
    """Merge every ``database.seeds.checks.*`` module's CHECKS. Modules may add to the same lesson's pool;
    keys must stay unique within a lesson, which ``validate_checks`` enforces."""
    import importlib
    import pkgutil

    from database.seeds import checks as package

    for info in sorted(pkgutil.iter_modules(package.__path__), key=lambda item: item.name):
        module = importlib.import_module(f"database.seeds.checks.{info.name}")
        for slug, items in getattr(module, "CHECKS", {}).items():
            CHECKS.setdefault(slug, []).extend(items)


_load_modules()


def validate_checks(checks: dict[str, list[dict]] = CHECKS) -> None:
    """Raise if any question would confuse a learner or the grader."""
    for slug, items in checks.items():
        where = f"checks for {slug!r}"
        if not MIN_PER_LESSON <= len(items) <= MAX_PER_LESSON:
            raise RuntimeError(f"{where}: needs {MIN_PER_LESSON}-{MAX_PER_LESSON} questions, has {len(items)}")
        keys = [item["key"] for item in items]
        if len(set(keys)) != len(keys):
            raise RuntimeError(f"{where}: duplicate keys")
        for item in items:
            label = f"{where} [{item['key']}]"
            if item["kind"] not in KINDS:
                raise RuntimeError(f"{label}: unknown kind {item['kind']!r}")
            for field in ("prompt", "explanation", "section", "concept"):
                if not str(item.get(field, "")).strip():
                    raise RuntimeError(f"{label}: missing {field}")
            if item["kind"] == "short_answer":
                if not str(item.get("model_answer", "")).strip():
                    raise RuntimeError(f"{label}: short_answer needs a model_answer")
                if item.get("options"):
                    raise RuntimeError(f"{label}: short_answer must not have options")
            else:
                options = item.get("options") or []
                if len(options) < 2:
                    raise RuntimeError(f"{label}: needs at least two options")
                if not isinstance(item.get("answer"), int) or not 0 <= item["answer"] < len(options):
                    raise RuntimeError(f"{label}: answer must index an option")


validate_checks()
