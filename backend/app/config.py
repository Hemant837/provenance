"""Application configuration loaded from environment variables."""

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
