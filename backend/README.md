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
uv run python run_server.py            # Windows (selector event loop)
# uv run uvicorn app.main:app --reload # Linux/macOS
```

On Windows the server must start via `run_server.py`: psycopg's async driver
(LangGraph's Postgres checkpointer) can't run on the default ProactorEventLoop,
and uvicorn's CLI forces that loop. The launcher installs a selector loop first.
On Linux (Render) the plain `uvicorn` CLI is fine.

Health checks: `GET /health` and `GET /health/db`.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/research` | Start a run → `{id, status, ...}` |
| GET | `/research/{id}/stream` | SSE: live node/log events, `hitl_ready`, `complete` |
| POST | `/research/{id}/review` | Resume HITL: `{decision: approve\|edit\|reject, edited_content?, feedback?}` |
| GET | `/research/{id}/status` | Current run status |
| GET | `/research/{id}/report` | Final report |
| GET | `/reports` | List the user's runs |

## Observability (LangSmith)

Tracing is **off by default**. To see every agent run (each node, LLM/tool call,
tokens, latency) in LangSmith, get an API key from smith.langchain.com and set in
`.env`:

```
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2-...
LANGSMITH_PROJECT=provenance
```

These are exported to the environment on startup (`configure_langsmith`) so
LangChain/LangGraph pick them up automatically — no code changes needed.

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
