"""Research run endpoints: create, stream (SSE), review, report, list."""

import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.config import get_settings
from app.db import get_db
from app.deps import get_current_user
from app.models import RunStatus, User

settings = get_settings()
from app.schemas import (
    CitationOut,
    ReportListItem,
    ReportOut,
    ResearchCreateIn,
    ReviewIn,
    RunOut,
)

router = APIRouter(prefix="/research", tags=["research"])


async def _owned_run(run_id: uuid.UUID, db: AsyncSession, user: User):
    run = await crud.get_run(db, run_id)
    if run is None or run.user_id != user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.post("", response_model=RunOut)
async def create_research(
    body: ResearchCreateIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Usage guardrails (rolling 24h) to cap API spend on a public demo.
    since = datetime.now(timezone.utc) - timedelta(days=1)

    user_runs = await crud.count_user_runs_since(db, user.id, since)
    if user_runs >= settings.max_runs_per_user_per_day:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Daily limit reached ({settings.max_runs_per_user_per_day} "
                "researches per 24 hours). Please try again later."
            ),
        )

    global_runs = await crud.count_runs_since(db, since)
    if global_runs >= settings.max_runs_global_per_day:
        raise HTTPException(
            status_code=429,
            detail="The demo has reached its daily capacity. Please try again tomorrow.",
        )

    run = await crud.create_run(db, user_id=user.id, query=body.query)
    # The driver starts when the client connects to /stream, so no events are missed.
    return run


@router.get("/{run_id}/stream")
async def stream_research(
    run_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    run = await _owned_run(run_id, db, user)
    manager = request.app.state.run_manager
    graph = request.app.state.graph

    # If already complete, replay the final result so a late/re-connecting client
    # still gets a terminal event instead of hanging.
    if run.status == RunStatus.complete:
        report = await crud.get_report(db, run_id)

        async def replay():
            if report is not None:
                payload = {
                    "summary": report.summary,
                    "final_report": report.content_markdown,
                    "citations": report.citations,
                }
                yield _sse({"event": "complete", "data": payload})

        return StreamingResponse(replay(), media_type="text/event-stream")

    # Only (re)start the driver for runs that haven't reached the review gate.
    if run.status in (
        RunStatus.pending,
        RunStatus.planning,
        RunStatus.searching,
        RunStatus.synthesizing,
    ):
        manager.ensure_started(str(run_id), run.query)

    # Snapshot the current state so a reconnecting client can rebuild the UI
    # even though earlier live events have already been consumed.
    snapshot = await _connect_snapshot(graph, run)

    async def event_source():
        for event in snapshot:
            yield _sse(event)
        async for event in manager.subscribe(str(run_id)):
            if await request.is_disconnected():
                break
            yield _sse(event)

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _connect_snapshot(graph, run) -> list[dict]:
    """Events to emit immediately on (re)connect, derived from current state."""
    events: list[dict] = [{"event": "status", "data": {"status": run.status.value}}]
    if run.status == RunStatus.failed:
        events.append(
            {"event": "error", "data": {"message": run.error or "The run failed."}}
        )
    elif run.status == RunStatus.awaiting_review:
        # Rebuild the review payload from the checkpointed graph state.
        state = await graph.aget_state({"configurable": {"thread_id": str(run.id)}})
        values = state.values if state else {}
        citations = values.get("citations", [])
        events.append(
            {
                "event": "hitl_ready",
                "data": {
                    "summary": values.get("summary", ""),
                    "draft": values.get("draft", ""),
                    "citations": [
                        c.model_dump() if hasattr(c, "model_dump") else c
                        for c in citations
                    ],
                },
            }
        )
    return events


@router.post("/{run_id}/review", response_model=RunOut)
async def review_research(
    run_id: uuid.UUID,
    body: ReviewIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    run = await _owned_run(run_id, db, user)
    if run.status != RunStatus.awaiting_review:
        raise HTTPException(status_code=409, detail="Run is not awaiting review")

    manager = request.app.state.run_manager
    ok = manager.submit_review(
        str(run_id),
        {
            "decision": body.decision,
            "edited_content": body.edited_content,
            "feedback": body.feedback,
        },
    )
    if not ok:
        raise HTTPException(status_code=409, detail="Run is not resumable")
    await db.refresh(run)
    return run


@router.get("/{run_id}/status", response_model=RunOut)
async def run_status(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _owned_run(run_id, db, user)


@router.get("/{run_id}/report", response_model=ReportOut)
async def get_report(
    run_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    run = await _owned_run(run_id, db, user)
    report = await crud.get_report(db, run_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not ready")
    return ReportOut(
        run_id=run.id,
        query=run.query,
        summary=report.summary,
        content_markdown=report.content_markdown,
        citations=[CitationOut(**c) for c in report.citations],
        word_count=report.word_count,
        created_at=report.created_at,
    )


# Listing endpoint lives at /reports (top-level), not under /research.
reports_router = APIRouter(tags=["reports"])


@reports_router.get("/reports", response_model=list[ReportListItem])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    runs = await crud.list_runs(db, user.id)
    items: list[ReportListItem] = []
    for run in runs:
        report = await crud.get_report(db, run.id)
        items.append(
            ReportListItem(
                run_id=run.id,
                query=run.query,
                status=run.status.value,
                created_at=run.created_at,
                has_report=report is not None,
            )
        )
    return items


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"
