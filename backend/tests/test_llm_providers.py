from pathlib import Path

from app.interviews.agent import MockInterviewAgent
from app.interviews.providers import (
    GeminiProvider,
    OpenAIProvider,
    OpenRouterProvider,
    OllamaProvider,
    get_llm_provider,
)
from app.interviews.providers.base import LLMProvider, parse_json_object


def test_factory_returns_named_providers():
    assert isinstance(get_llm_provider("ollama"), OllamaProvider)
    assert isinstance(get_llm_provider("openai"), OpenAIProvider)
    assert isinstance(get_llm_provider("gemini"), GeminiProvider)
    assert isinstance(get_llm_provider("openrouter"), OpenRouterProvider)
    assert issubclass(OllamaProvider, LLMProvider)
    assert issubclass(OpenAIProvider, LLMProvider)
    assert issubclass(GeminiProvider, LLMProvider)
    assert issubclass(OpenRouterProvider, LLMProvider)


def test_factory_rejects_unknown_provider():
    try:
        get_llm_provider("anthropic")
    except ValueError as exc:
        assert "anthropic" in str(exc)
        return
    raise AssertionError("expected ValueError")


def test_agent_module_does_not_import_ollama():
    source = Path("app/interviews/agent.py").read_text(encoding="utf-8")
    assert "ollama" not in source.lower()
    assert "openai" not in source.lower()
    assert "gemini" not in source.lower()
    assert "openrouter" not in source.lower()
    assert "from app.interviews.providers.base import LLMProvider" in source


def test_agent_accepts_any_llm_provider():
    class MemoryProvider(LLMProvider):
        name = "memory"

        def complete(self, system, transcript, user_turn) -> str:
            return "What is the time complexity?"

        def complete_json(self, system, user_turn) -> dict:
            return {"overall": 8}

    agent = MockInterviewAgent(MemoryProvider())
    assert agent.provider.name == "memory"


def test_parse_json_object_extracts_object():
    assert parse_json_object('noise {"understanding": 8} trailing') == {"understanding": 8}


def test_openrouter_uses_explicit_model_then_config_default():
    provider = OpenRouterProvider(api_key="sk-or-test", model="nvidia/nemotron-3.5-lightning:free")
    assert provider.model == "nvidia/nemotron-3.5-lightning:free"
    fallback = OpenRouterProvider(api_key="sk-or-test", model="")
    assert fallback.model is None


def test_gemini_maps_assistant_turns_to_model_role():
    from app.interviews.providers.gemini_provider import _to_gemini_contents

    contents = _to_gemini_contents(
        [
            {"role": "assistant", "content": "Explain the problem."},
            {"role": "user", "content": "Two sum."},
        ]
    )
    assert contents[0]["role"] == "model"
    assert contents[1]["role"] == "user"
