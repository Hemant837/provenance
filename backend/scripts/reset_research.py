"""Wipe all research data for a fresh start (keeps user accounts).

Deletes every research run (cascading to reports + HITL reviews) and clears the
LangGraph checkpoint tables.

Usage:
    uv run python -m scripts.reset_research
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import text  # noqa: E402

from app.db import engine  # noqa: E402

CHECKPOINT_TABLES = ["checkpoint_writes", "checkpoint_blobs", "checkpoints"]


async def main() -> None:
    async with engine.begin() as conn:
        result = await conn.execute(text("DELETE FROM research_runs"))
        print(f"Deleted {result.rowcount} run(s) (reports + reviews cascaded).")

        for table in CHECKPOINT_TABLES:
            try:
                await conn.execute(text(f"TRUNCATE TABLE {table}"))
                print(f"Cleared {table}.")
            except Exception as exc:  # noqa: BLE001 — table may not exist yet
                print(f"Skipped {table}: {exc}")

    await engine.dispose()
    print("Done — fresh start.")


if __name__ == "__main__":
    asyncio.run(main())
