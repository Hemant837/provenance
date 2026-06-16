# Provenance — Backend

FastAPI backend for the Provenance agentic research-and-report system.
See [`../docs/SPEC.md`](../docs/SPEC.md) for the full project spec.

## Stack

FastAPI · SQLAlchemy (async, asyncpg) · Alembic · Neon Postgres · LangGraph · LangChain · OpenAI · Tavily · Google OAuth (JWT)

## Setup

```bash
# Install deps into a uv-managed venv
uv sync

# Configure environment
cp .env.example .env   # then fill in Neon, OpenAI, Tavily, Google OAuth values

# Run migrations
uv run alembic upgrade head

# Start the dev server
uv run uvicorn app.main:app --reload --port 8000
```

Health checks: `GET /health` and `GET /health/db`.

## Layout

```
app/
  main.py         FastAPI app + middleware
  config.py       Settings (pydantic-settings)
  db.py           Async engine/session + Base
  models.py       ORM models: users, research_runs, reports, hitl_reviews
  routers/        API routers (health; agent + auth added next)
alembic/          Migrations
```
