"""CLI to run the research graph with HITL, for manual verification.

Usage:
    # approve the first draft
    uv run python -m app.agent.run "your research question"

    # reject once with feedback (re-search), then approve
    uv run python -m app.agent.run "your research question" --reject "focus more on X"
"""

import argparse
import asyncio
import sys
import uuid

from langgraph.types import Command

# psycopg's async driver cannot run on Windows' default ProactorEventLoop.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.agent.checkpointer import open_checkpointer
from app.agent.graph import build_graph
from app.config import configure_langsmith

configure_langsmith()


def _interrupt_value(result: dict):
    """Return the interrupt payload if the graph paused, else None."""
    interrupts = result.get("__interrupt__")
    if interrupts:
        return interrupts[0].value
    return None


def _print_draft(label: str, payload: dict) -> None:
    print(f"\n=== {label} ===")
    print(f"\n[summary]\n{payload.get('summary', '')}")
    print(f"\n[draft]\n{payload.get('draft', '')}")
    print(f"\n[citations] {len(payload.get('citations', []))} sources")


async def main(query: str, reject_feedback: str | None) -> None:
    async with open_checkpointer() as saver:
        graph = build_graph(checkpointer=saver)
        config = {"configurable": {"thread_id": uuid.uuid4().hex}}

        print(f"\n>>> Researching: {query}")
        result = await graph.ainvoke({"query": query}, config)

        payload = _interrupt_value(result)
        if payload is None:
            print("ERROR: graph did not pause at HITL as expected.")
            return
        _print_draft("HITL PAUSE (first draft)", payload)

        if reject_feedback:
            print(f"\n>>> REJECT with feedback: {reject_feedback!r} — re-searching...")
            result = await graph.ainvoke(
                Command(resume={"decision": "reject", "feedback": reject_feedback}),
                config,
            )
            payload = _interrupt_value(result)
            if payload is None:
                print("ERROR: graph did not pause again after reject.")
                return
            _print_draft("HITL PAUSE (revised draft after reject)", payload)

        print("\n>>> APPROVE — finalizing...")
        result = await graph.ainvoke(Command(resume={"decision": "approve"}), config)

        print(f"\n=== FINAL REPORT ===\n{result.get('final_report', '(none)')}")
        citations = result.get("citations", [])
        print(f"\n=== SOURCES ({len(citations)}) ===")
        for c in citations:
            print(f"  [{c.n}] {c.title} — {c.url}")
        print(f"\n(revision loops: {result.get('revision', 0)})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--reject", dest="reject", default=None)
    args = parser.parse_args()
    asyncio.run(main(args.query, args.reject))
