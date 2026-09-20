"""Written solutions shown in a problem's Solution tab.

One file per topic, each exporting ``SOLUTIONS: list[dict]``. This package gathers them.
Read ``SOLUTION_GUIDE.md`` before adding content, then run:

    cd backend && .venv/bin/python -m pytest tests/test_solution_content.py -q
    cd backend && .venv/bin/python scripts/check_solutions.py --slug <slug>
"""

from __future__ import annotations

import importlib
import pkgutil

SOLUTIONS: list[dict] = []
for _module in sorted(pkgutil.iter_modules(__path__), key=lambda item: item.name):
    if _module.name.startswith("_"):
        continue
    SOLUTIONS.extend(importlib.import_module(f"{__name__}.{_module.name}").SOLUTIONS)
