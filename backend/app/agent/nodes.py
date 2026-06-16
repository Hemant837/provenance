"""Research graph nodes: plan, search, synthesize, finalize."""

import asyncio

from langchain_openai import ChatOpenAI

from app.agent.prompts import (
    PLANNER_SYSTEM,
    SYNTHESIZER_SYSTEM,
    format_sources,
)
from app.agent.state import (
    Citation,
    PlanOutput,
    ReportOutput,
    ResearchState,
    SearchResult,
)
from app.agent.tools import search
from app.config import get_settings

settings = get_settings()


def _llm(temperature: float = 0.2) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=temperature,
    )


async def plan_node(state: ResearchState) -> dict:
    """Decompose the query into focused sub-queries."""
    llm = _llm(temperature=0.0).with_structured_output(PlanOutput)
    result: PlanOutput = await llm.ainvoke(
        [
            ("system", PLANNER_SYSTEM),
            ("human", f"Research query:\n{state['query']}"),
        ]
    )
    return {"sub_queries": result.sub_queries}


async def search_node(state: ResearchState) -> dict:
    """Run a Tavily search for each sub-query, concurrently."""
    sub_queries = state["sub_queries"]
    batches = await asyncio.gather(*(search(sq) for sq in sub_queries))
    results: list[SearchResult] = [r for batch in batches for r in batch]
    return {"search_results": results}


def _dedupe_sources(results: list[SearchResult]) -> list[Citation]:
    """Assign stable citation numbers to unique source URLs (first-seen order)."""
    citations: list[Citation] = []
    seen: set[str] = set()
    for r in results:
        if r.url and r.url not in seen:
            seen.add(r.url)
            citations.append(Citation(n=len(citations) + 1, title=r.title, url=r.url))
    return citations


async def synthesize_node(state: ResearchState) -> dict:
    """Draft a structured, cited report from the search results."""
    results = state["search_results"]
    citations = _dedupe_sources(results)
    url_to_n = {c.url: c.n for c in citations}

    numbered = [
        (url_to_n[r.url], r.title, r.url, r.content)
        for r in results
        if r.url in url_to_n
    ]
    # Keep only the first occurrence per source for the prompt context.
    seen: set[int] = set()
    unique_numbered = []
    for n, title, url, content in numbered:
        if n not in seen:
            seen.add(n)
            unique_numbered.append((n, title, url, content))

    sources_block = format_sources(unique_numbered)

    llm = _llm(temperature=0.3).with_structured_output(ReportOutput)
    report: ReportOutput = await llm.ainvoke(
        [
            ("system", SYNTHESIZER_SYSTEM),
            (
                "human",
                f"Research question:\n{state['query']}\n\n"
                f"Numbered sources:\n{sources_block}",
            ),
        ]
    )
    return {
        "summary": report.summary,
        "draft": report.content_markdown,
        "citations": citations,
    }


async def finalize_node(state: ResearchState) -> dict:
    """Produce the final report. (HITL is added in a later build step.)"""
    return {"final_report": state["draft"]}
