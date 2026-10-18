"""Unified LLM Provider supporting Google Gemini API, Anthropic Claude, and Ollama Cloud."""

import os
import json
import logging
from typing import Optional, Any
from app.config import settings

logger = logging.getLogger(__name__)


def extract_text(content: Any) -> str:
    """Safely extracts string text from LangChain message content (handles str or list of blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for p in content:
            if isinstance(p, str):
                parts.append(p)
            elif isinstance(p, dict) and "text" in p:
                parts.append(p["text"])
            elif hasattr(p, "text"):
                parts.append(getattr(p, "text"))
            else:
                parts.append(str(p))
        return "".join(parts)
    return str(content)


def get_llm(model_name: Optional[str] = None, temperature: float = 0.2):
    """Factory returning a LangChain-compatible LLM instance based on configuration."""
    provider = os.getenv("LLM_PROVIDER", settings.LLM_PROVIDER).lower()

    # 1. Anthropic Claude
    if provider in ["claude", "anthropic"]:
        api_key = os.getenv("ANTHROPIC_API_KEY", settings.ANTHROPIC_API_KEY)
        selected_model = model_name or os.getenv("CLAUDE_MODEL", settings.CLAUDE_MODEL)
        if api_key:
            try:
                from langchain_anthropic import ChatAnthropic
                logger.info(f"Using Anthropic Claude LLM provider: {selected_model}")
                return ChatAnthropic(
                    model_name=selected_model,
                    anthropic_api_key=api_key,
                    temperature=temperature,
                    max_retries=1
                )
            except Exception as e:
                logger.warning(f"Failed to initialize ChatAnthropic ({e}), attempting fallback...")
        else:
            logger.warning("ANTHROPIC_API_KEY not configured for 'claude' provider.")

    # 2. Ollama Cloud
    elif provider in ["ollama_cloud", "ollama"]:
        api_key = os.getenv("OLLAMA_CLOUD_API_KEY", settings.OLLAMA_CLOUD_API_KEY) or "ollama"
        base_url = os.getenv("OLLAMA_CLOUD_BASE_URL", settings.OLLAMA_CLOUD_BASE_URL)
        selected_model = model_name or os.getenv("OLLAMA_CLOUD_MODEL", settings.OLLAMA_CLOUD_MODEL)
        try:
            from langchain_openai import ChatOpenAI
            logger.info(f"Using Ollama Cloud LLM provider: {selected_model} at {base_url}")
            return ChatOpenAI(
                base_url=base_url,
                api_key=api_key,
                model=selected_model,
                temperature=temperature
            )
        except Exception as e:
            logger.warning(f"Failed to initialize Ollama Cloud ({e}), attempting fallback...")

    # 3. Google Gemini (Default)
    api_key = (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or settings.GEMINI_API_KEY
    )

    selected_model = (
        model_name
        or os.getenv("STARTUP_VALIDATOR_MODEL", settings.STARTUP_VALIDATOR_MODEL)
    )

    if api_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            logger.info(f"Using Google Gemini LLM provider: {selected_model}")
            return ChatGoogleGenerativeAI(
                model=selected_model,
                google_api_key=api_key,
                temperature=temperature,
                max_retries=1
            )
        except Exception as e:
            logger.warning(f"Failed to initialize ChatGoogleGenerativeAI: {e}")

    logger.warning("No active LLM credentials configured. Operating with calibrated fallback.")
    return None
