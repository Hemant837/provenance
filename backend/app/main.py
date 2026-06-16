"""FastAPI application entrypoint."""

import asyncio
import sys
from contextlib import asynccontextmanager

# psycopg's async driver (LangGraph Postgres checkpointer) cannot run on Windows'
# default ProactorEventLoop. Set the selector policy before the loop is created.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver  # noqa: E402
from psycopg.rows import dict_row  # noqa: E402
from psycopg_pool import AsyncConnectionPool  # noqa: E402
from starlette.middleware.sessions import SessionMiddleware  # noqa: E402

from app.agent.checkpointer import psycopg_conn_string  # noqa: E402
from app.agent.graph import build_graph  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.routers import auth, health, research  # noqa: E402
from app.run_manager import RunManager  # noqa: E402

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = AsyncConnectionPool(
        conninfo=psycopg_conn_string(),
        max_size=10,
        open=False,
        # Neon drops idle connections; validate (and recycle) on checkout so a
        # stale connection never reaches the checkpointer.
        check=AsyncConnectionPool.check_connection,
        max_idle=60.0,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
    )
    await pool.open()
    checkpointer = AsyncPostgresSaver(pool)
    await checkpointer.setup()

    app.state.graph = build_graph(checkpointer=checkpointer)
    app.state.run_manager = RunManager(app.state.graph)
    try:
        yield
    finally:
        await pool.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(SessionMiddleware, secret_key=settings.session_secret)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(research.router)
app.include_router(research.reports_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "status": "running"}
