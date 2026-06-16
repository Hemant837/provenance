"""Postgres checkpointer for pausing/resuming the research graph (HITL)."""

from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.config import get_settings


def psycopg_conn_string() -> str:
    """Derive a libpq connection string from the sync DB URL."""
    return get_settings().database_url_sync.replace(
        "postgresql+psycopg://", "postgresql://", 1
    )


@asynccontextmanager
async def open_checkpointer():
    """Yield an initialized AsyncPostgresSaver (creates its tables on first use)."""
    async with AsyncPostgresSaver.from_conn_string(psycopg_conn_string()) as saver:
        await saver.setup()
        yield saver
