"""CLI to run the research graph end-to-end for manual verification.

Usage:
    uv run python -m app.agent.run "your research question"
"""

import asyncio
import sys

from app.agent.graph import research_graph
from app.agent.state import Citation


async def main(query: str) -> None:
    print(f"\n=== Researching: {query} ===\n")
    final = await research_graph.ainvoke({"query": query})

    print("--- SUB-QUERIES ---")
    for sq in final.get("sub_queries", []):
        print(f"  • {sq}")

    print(f"\n--- SUMMARY ---\n{final.get('summary', '(none)')}")

    print(f"\n--- REPORT ---\n{final.get('final_report', '(none)')}")

    citations: list[Citation] = final.get("citations", [])
    print(f"\n--- SOURCES ({len(citations)}) ---")
    for c in citations:
        print(f"  [{c.n}] {c.title} — {c.url}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: uv run python -m app.agent.run "your research question"')
        raise SystemExit(1)
    asyncio.run(main(sys.argv[1]))
