"""Agent state and structured-output models for the research graph."""

from typing import TypedDict

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    """A single web result returned by Tavily for a sub-query."""

    sub_query: str
    title: str
    url: str
    content: str


class Citation(BaseModel):
    """A numbered source referenced by the report via inline [n] markers."""

    n: int
    title: str
    url: str


# --- LLM structured-output schemas ---


class PlanOutput(BaseModel):
    """Planner output: focused sub-queries covering the research topic."""

    sub_queries: list[str] = Field(
        description="3-5 focused, non-overlapping web search queries.",
        min_length=1,
        max_length=6,
    )


class ReportOutput(BaseModel):
    """Synthesizer output: a structured, cited report."""

    summary: str = Field(description="A 2-4 sentence TL;DR of the findings.")
    content_markdown: str = Field(
        description=(
            "The full report in markdown: H2 sections with prose, using inline "
            "[n] citation markers that reference the numbered sources."
        )
    )


# --- Graph state ---


class ResearchState(TypedDict, total=False):
    """State threaded through the research graph."""

    query: str
    sub_queries: list[str]
    search_results: list[SearchResult]
    citations: list[Citation]
    summary: str
    draft: str
    # HITL: set when the reviewer resumes the graph.
    decision: str  # "approve" | "edit" | "reject"
    human_feedback: str | None  # carried into a re-search on reject
    revision: int  # how many reject loops have run
    final_report: str
