"""Drives a research run, pumping live events to subscribers and handling HITL.

Each run gets an in-memory event queue. A background driver task runs the graph
via ``astream``, emitting node/log events; at the HITL interrupt it persists the
draft, emits ``hitl_ready``, and waits for a review decision to resume. On
``reject`` the graph loops back and streams the re-search live on the same queue.

Note: the live event queue is in-memory (single worker / single viewer). Graph
state itself is durable via the Postgres checkpointer, so a run can still be
resumed after a restart even though the live stream is lost.
"""

import asyncio
import uuid

from langgraph.types import Command

from app import crud
from app.db import AsyncSessionLocal
from app.models import ReviewDecision, RunStatus

# Sentinel pushed to the queue to signal the stream is finished.
_DONE = object()


class _Run:
    def __init__(self) -> None:
        self.queue: asyncio.Queue = asyncio.Queue()
        self.resume_future: asyncio.Future | None = None
        self.task: asyncio.Task | None = None
        self.started = False
        self.finished = False


class RunManager:
    def __init__(self, graph) -> None:
        self.graph = graph
        self._runs: dict[str, _Run] = {}

    # --- lifecycle ---

    def ensure_started(self, run_id: str, query: str) -> None:
        """Start the driver for a run if it isn't already running."""
        run = self._runs.get(run_id)
        if run is None:
            run = _Run()
            self._runs[run_id] = run
        if not run.started:
            run.started = True
            run.task = asyncio.create_task(self._drive(run_id, query))

    async def subscribe(self, run_id: str):
        """Yield events for a run until it finishes."""
        run = self._runs.get(run_id)
        if run is None:
            return
        while True:
            item = await run.queue.get()
            if item is _DONE:
                break
            yield item

    def submit_review(self, run_id: str, payload: dict) -> bool:
        """Resume a paused run with the reviewer's decision."""
        run = self._runs.get(run_id)
        if run is None or run.resume_future is None or run.resume_future.done():
            return False
        run.resume_future.set_result(payload)
        return True

    # --- internals ---

    async def _emit(self, run: _Run, event: dict) -> None:
        await run.queue.put(event)

    async def _drive(self, run_id: str, query: str) -> None:
        run = self._runs[run_id]
        rid = uuid.UUID(run_id)
        config = {"configurable": {"thread_id": run_id}}
        graph_input: dict | Command = {"query": query}

        try:
            while True:
                interrupt_payload = None

                async for mode, chunk in self.graph.astream(
                    graph_input, config, stream_mode=["updates", "custom"]
                ):
                    if mode == "custom":
                        await self._emit(run, {"event": "log", "data": chunk})
                        continue

                    # mode == "updates": {node_name: update} or {"__interrupt__": (...)}
                    for key, value in chunk.items():
                        if key == "__interrupt__":
                            interrupt_payload = value[0].value
                        else:
                            await self._on_node_update(run, rid, key, value)

                if interrupt_payload is not None:
                    decision = await self._await_review(run, rid, interrupt_payload)
                    graph_input = Command(resume=decision)
                    next_status = (
                        RunStatus.searching
                        if decision.get("decision") == "reject"
                        else RunStatus.finalizing
                    )
                    await self._set_status(rid, next_status)
                    continue

                # No interrupt -> the graph reached the end.
                await self._on_complete(run, rid, config)
                break

        except Exception as exc:  # noqa: BLE001 — surface any failure to the client
            await self._set_status(rid, RunStatus.failed, error=str(exc))
            await self._emit(run, {"event": "error", "data": {"message": str(exc)}})
        finally:
            run.finished = True
            await run.queue.put(_DONE)

    async def _on_node_update(self, run: _Run, rid: uuid.UUID, node: str, value: dict) -> None:
        """Translate a completed node into client events + a status update."""
        if node == "plan":
            await self._set_status(rid, RunStatus.searching, current_node="search")
            await self._emit(
                run,
                {"event": "plan", "data": {"sub_queries": value.get("sub_queries", [])}},
            )
        elif node == "search":
            await self._set_status(rid, RunStatus.synthesizing, current_node="synthesize")
            await self._emit(
                run,
                {"event": "search", "data": {"count": len(value.get("search_results", []))}},
            )
        elif node == "synthesize":
            await self._emit(run, {"event": "synthesized", "data": {}})

    async def _await_review(self, run: _Run, rid: uuid.UUID, payload: dict) -> dict:
        """Persist the draft, emit hitl_ready, and block until a review arrives."""
        await self._set_status(rid, RunStatus.awaiting_review, current_node="hitl")
        await self._emit(run, {"event": "hitl_ready", "data": payload})

        loop = asyncio.get_running_loop()
        run.resume_future = loop.create_future()
        decision = await run.resume_future

        async with AsyncSessionLocal() as db:
            await crud.save_hitl_review(
                db,
                run_id=rid,
                draft=payload.get("draft", ""),
                decision=ReviewDecision(decision.get("decision", "approve")),
                edited_content=decision.get("edited_content"),
                feedback=decision.get("feedback"),
            )
        return decision

    async def _on_complete(self, run: _Run, rid: uuid.UUID, config: dict) -> None:
        state = await self.graph.aget_state(config)
        values = state.values
        citations = [c.model_dump() for c in values.get("citations", [])]
        async with AsyncSessionLocal() as db:
            await crud.save_report(
                db,
                run_id=rid,
                summary=values.get("summary", ""),
                content_markdown=values.get("final_report", ""),
                citations=citations,
            )
            await crud.update_run_status(db, rid, RunStatus.complete, current_node="finalize")
        await self._emit(
            run,
            {
                "event": "complete",
                "data": {
                    "summary": values.get("summary", ""),
                    "final_report": values.get("final_report", ""),
                    "citations": citations,
                },
            },
        )

    async def _set_status(
        self,
        rid: uuid.UUID,
        status: RunStatus,
        *,
        current_node: str | None = None,
        error: str | None = None,
    ) -> None:
        async with AsyncSessionLocal() as db:
            await crud.update_run_status(
                db, rid, status, current_node=current_node, error=error
            )
