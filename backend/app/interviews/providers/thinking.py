"""Keep a model's private reasoning out of what the learner sees or hears.

Reasoning models (qwen3, nemotron, deepseek-r1 and friends) think before they answer. Providers are asked
not to send that scratchpad at all; when one arrives inline as <think>…</think>, these helpers drop it.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Iterator

_THINK_BLOCK = re.compile(r"<think>.*?</think>\s*", re.DOTALL | re.IGNORECASE)
_UNCLOSED_THINK = re.compile(r"<think>.*\Z", re.DOTALL | re.IGNORECASE)

_THINK_OPEN = "<think>"
_THINK_CLOSE = "</think>"


def strip_thinking(deltas: Iterable[str]) -> Iterator[str]:
    """Drop inline <think>…</think> scratchpads from a stream of text pieces.

    Some builds emit the reasoning inside the content itself. Text is held back only while a tag
    could still be forming, so ordinary replies stream through untouched.
    """
    buffer = ""
    inside = False
    for delta in deltas:
        buffer += delta
        while buffer:
            if inside:
                end = buffer.find(_THINK_CLOSE)
                if end == -1:
                    buffer = buffer[-(len(_THINK_CLOSE) - 1) :] if len(buffer) >= len(_THINK_CLOSE) else buffer
                    break
                buffer = buffer[end + len(_THINK_CLOSE) :]
                inside = False
                continue
            start = buffer.find(_THINK_OPEN)
            if start != -1:
                if start:
                    yield buffer[:start]
                buffer = buffer[start + len(_THINK_OPEN) :]
                inside = True
                continue
            # Keep a tail that might be the start of an opening tag; emit the rest.
            keep = 0
            for size in range(min(len(_THINK_OPEN) - 1, len(buffer)), 0, -1):
                if _THINK_OPEN.startswith(buffer[-size:]):
                    keep = size
                    break
            emit = buffer[: len(buffer) - keep] if keep else buffer
            if emit:
                yield emit
            buffer = buffer[len(buffer) - keep :] if keep else ""
            break
    if buffer and not inside:
        yield buffer


def strip_think_blocks(text: str) -> str:
    """Remove complete and unfinished <think> blocks from a whole reply."""
    return _UNCLOSED_THINK.sub("", _THINK_BLOCK.sub("", text or ""))
