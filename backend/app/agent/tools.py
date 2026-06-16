"""Tavily web search wrapper."""

import asyncio

from tavily import TavilyClient

from app.agent.state import SearchResult
from app.config import get_settings

settings = get_settings()
_client = TavilyClient(api_key=settings.tavily_api_key)


def _search_sync(query: str, max_results: int) -> list[SearchResult]:
    response = _client.search(
        query=query,
        max_results=max_results,
        search_depth="advanced",
    )
    results: list[SearchResult] = []
    for item in response.get("results", []):
        results.append(
            SearchResult(
                sub_query=query,
                title=item.get("title", "") or item.get("url", ""),
                url=item.get("url", ""),
                content=item.get("content", ""),
            )
        )
    return results


async def search(query: str, max_results: int = 4) -> list[SearchResult]:
    """Run a Tavily search off the event loop (the client is synchronous)."""
    return await asyncio.to_thread(_search_sync, query, max_results)
