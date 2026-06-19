"""Database access helpers for runs, reports, and HITL reviews."""

import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    HitlReview,
    Report,
    ResearchRun,
    ReviewDecision,
    RunStatus,
    User,
)


async def get_or_create_user(
    db: AsyncSession, *, google_id: str, email: str, name: str | None = None,
    avatar_url: str | None = None,
) -> User:
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(google_id=google_id, email=email, name=name, avatar_url=avatar_url)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


async def create_run(db: AsyncSession, *, user_id: uuid.UUID, query: str) -> ResearchRun:
    run = ResearchRun(user_id=user_id, query=query, status=RunStatus.pending)
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def get_run(db: AsyncSession, run_id: uuid.UUID) -> ResearchRun | None:
    return await db.get(ResearchRun, run_id)


async def count_user_runs_since(
    db: AsyncSession, user_id: uuid.UUID, since: datetime
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ResearchRun)
        .where(ResearchRun.user_id == user_id, ResearchRun.created_at >= since)
    )
    return result.scalar_one()


async def count_runs_since(db: AsyncSession, since: datetime) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ResearchRun)
        .where(ResearchRun.created_at >= since)
    )
    return result.scalar_one()


async def list_runs(db: AsyncSession, user_id: uuid.UUID) -> list[ResearchRun]:
    result = await db.execute(
        select(ResearchRun)
        .where(ResearchRun.user_id == user_id)
        .order_by(ResearchRun.created_at.desc())
    )
    return list(result.scalars().all())


async def update_run_status(
    db: AsyncSession,
    run_id: uuid.UUID,
    status: RunStatus,
    *,
    current_node: str | None = None,
    error: str | None = None,
) -> None:
    run = await db.get(ResearchRun, run_id)
    if run is None:
        return
    run.status = status
    if current_node is not None:
        run.current_node = current_node
    if error is not None:
        run.error = error
    await db.commit()


async def save_report(
    db: AsyncSession,
    *,
    run_id: uuid.UUID,
    summary: str,
    content_markdown: str,
    citations: list[dict],
) -> Report:
    """Upsert the report for a run (a reject loop can produce a new final report)."""
    existing = await db.execute(select(Report).where(Report.run_id == run_id))
    report = existing.scalar_one_or_none()
    word_count = len(content_markdown.split())
    if report is None:
        report = Report(
            run_id=run_id,
            summary=summary,
            content_markdown=content_markdown,
            citations=citations,
            word_count=word_count,
        )
        db.add(report)
    else:
        report.summary = summary
        report.content_markdown = content_markdown
        report.citations = citations
        report.word_count = word_count
    await db.commit()
    await db.refresh(report)
    return report


async def get_report(db: AsyncSession, run_id: uuid.UUID) -> Report | None:
    result = await db.execute(select(Report).where(Report.run_id == run_id))
    return result.scalar_one_or_none()


async def save_hitl_review(
    db: AsyncSession,
    *,
    run_id: uuid.UUID,
    draft: str,
    decision: ReviewDecision,
    edited_content: str | None = None,
    feedback: str | None = None,
) -> HitlReview:
    review = HitlReview(
        run_id=run_id,
        draft=draft,
        decision=decision,
        edited_content=edited_content,
        feedback=feedback,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review
