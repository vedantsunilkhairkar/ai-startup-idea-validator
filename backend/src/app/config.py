""" Configuration management for API keys, model settings, and environment variables."""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # AI Model & Provider Flags
    LLM_PROVIDER: str = "gemini"  # "gemini", "claude", or "ollama_cloud"

    # Google Gemini Settings
    GEMINI_API_KEY: Optional[str] = None
    STARTUP_VALIDATOR_MODEL: str = "gemini-3.8-flash"

    # Anthropic Claude Settings
    ANTHROPIC_API_KEY: Optional[str] = None
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"

    # Ollama Cloud Settings
    OLLAMA_CLOUD_API_KEY: Optional[str] = None
    OLLAMA_CLOUD_BASE_URL: str = "https://api.ollama.com/v1"
    OLLAMA_CLOUD_MODEL: str = "llama3.3"


    # Database (PostgreSQL)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "vedant123"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "AI-Start-Validator"
    DATABASE_URL: Optional[str] = None

    @property
    def postgres_dsn(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Authentication (JWT & bcrypt)
    JWT_SECRET: str = "ai-startup-validator-jwt-secret-key-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # External APIs
    TAVILY_API_KEY: Optional[str] = None
    NEWS_API_KEY: Optional[str] = None
    NEWSDATA_API_KEY: Optional[str] = None
    SERPAPI_API_KEY: Optional[str] = None

    # Search & Logging
    SEARCH_ENGINE: str = "duckduckgo"
    MAX_RESULTS: int = 5
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()

