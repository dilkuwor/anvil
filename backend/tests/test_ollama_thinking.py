from app.interviews.ollama import _clean_reply
from app.interviews.providers.thinking import strip_think_blocks, strip_thinking


def test_stream_filter_drops_inline_scratchpad_split_across_pieces():
    pieces = ["<thi", "nk>plan the ans", "wer</th", "ink>Hello", " there.", " Done<", "think>x</think>!"]
    assert "".join(strip_thinking(pieces)) == "Hello there. Done!"


def test_stream_filter_leaves_plain_text_alone():
    pieces = ["Sharding ", "splits data", " across nodes <b>bold</b>."]
    assert "".join(strip_thinking(pieces)) == "Sharding splits data across nodes <b>bold</b>."


def test_stream_filter_keeps_text_that_only_looked_like_a_tag():
    assert "".join(strip_thinking(["a < b and <thing>", " ok"])) == "a < b and <thing> ok"


def test_clean_reply_strips_thinking_block():
    assert _clean_reply("<think>\nreasoning here\n</think>\nThe answer.") == "The answer."


def test_strip_think_blocks_handles_unfinished_reasoning():
    assert strip_think_blocks("<think>still going") == ""
    assert strip_think_blocks("Answer. <THINK>x</THINK>") == "Answer. "
