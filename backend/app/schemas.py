"""API request/response schemas."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str | None = None
    avatar_url: str | None = None


class ResearchCreateIn(BaseModel):
    query: str = Field(min_length=3, max_length=2000)


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    query: str
    status: str
    current_node: str | None = None
    created_at: datetime


class ReviewIn(BaseModel):
    decision: Literal["approve", "edit", "reject"]
    edited_content: str | None = None
    feedback: str | None = None


class CitationOut(BaseModel):
    n: int
    title: str
    url: str


class ReportOut(BaseModel):
    run_id: uuid.UUID
    query: str
    summary: str | None
    content_markdown: str
    citations: list[CitationOut]
    word_count: int
    created_at: datetime


class ReportListItem(BaseModel):
    run_id: uuid.UUID
    query: str
    status: str
    created_at: datetime
    has_report: bool
