"""Extra System Design case studies, one module per case.

Each module exports ``CASE`` built with ``SD`` from ``learn_system_design``. Modules are picked
up automatically and appended to the Interview Case Studies topic.
"""

from __future__ import annotations

import importlib
import pkgutil


def extra_cases() -> list[dict]:
    cases = []
    for module in sorted(pkgutil.iter_modules(__path__), key=lambda item: item.name):
        if module.name.startswith("_"):
            continue
        cases.append(importlib.import_module(f"{__name__}.{module.name}").CASE)
    return cases
