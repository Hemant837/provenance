"""Dev server launcher.

On Windows, psycopg's async driver (used by the LangGraph Postgres checkpointer)
cannot run on the default ProactorEventLoop. We must install the selector policy
*before* uvicorn creates its event loop — hence this launcher rather than calling
the `uvicorn` CLI directly.

Usage:
    uv run python run_server.py

Note: auto-reload is disabled on Windows because uvicorn's reloader forces a
Proactor loop in its worker subprocess, which is incompatible with psycopg async.
On Linux (e.g. Render) the plain `uvicorn app.main:app` CLI works fine.
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn  # noqa: E402

if __name__ == "__main__":
    # loop="none" stops uvicorn from forcing its own (Proactor) loop policy on
    # Windows, so the selector loop we install above is the one that runs.
    config = uvicorn.Config(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        loop="none",
    )
    asyncio.run(uvicorn.Server(config).serve())
