"""Application configuration loaded from environment variables."""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    app_name: str = "Provenance"
    environment: str = "development"
    frontend_origin: str = "http://localhost:3000"

    # Database (Neon Postgres). Use the asyncpg driver for the app.
    # Example: postgresql+asyncpg://user:pass@host/db
    database_url: str
    # Sync/psycopg URL for the LangGraph Postgres checkpointer + Alembic.
    # Example: postgresql+psycopg://user:pass@host/db?sslmode=require
    database_url_sync: str
    # SSL mode passed to asyncpg via connect_args (Neon requires SSL).
    # Use "" to disable (e.g. local Postgres without SSL).
    db_ssl: str = "require"

    # LLM + search
    openai_api_key: str
    openai_model: str = "gpt-4o"
    tavily_api_key: str

    # Usage guardrails (rolling 24h window) — protect API spend on a public demo.
    max_runs_per_user_per_day: int = 5
    max_runs_global_per_day: int = 50

    # LangSmith tracing
    langsmith_tracing: bool = False
    langsmith_api_key: str | None = None
    langsmith_project: str = "provenance"

    # Auth — dev defaults; set real values before enabling Google OAuth (build step 5).
    jwt_secret: str = "dev-jwt-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"
    session_secret: str = "dev-session-secret-change-me"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


def configure_langsmith() -> bool:
    """Activate LangSmith tracing if enabled.

    LangChain/LangGraph read tracing config from os.environ, but pydantic-settings
    only loads it into our Settings object — so we export the values here. Call
    once at startup (server lifespan and the CLI). Returns whether tracing is on.
    """
    s = get_settings()
    if not (s.langsmith_tracing and s.langsmith_api_key):
        return False
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_API_KEY"] = s.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = s.langsmith_project
    # Back-compat env names for older LangChain integrations.
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = s.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = s.langsmith_project
    return True
