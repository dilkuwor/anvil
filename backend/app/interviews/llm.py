"""Compatibility shim. New code should import from app.interviews.providers."""

from app.interviews.providers import LLMProvider, get_llm_provider

InterviewLLM = LLMProvider
get_interview_llm = get_llm_provider

__all__ = ["InterviewLLM", "LLMProvider", "get_interview_llm", "get_llm_provider"]
