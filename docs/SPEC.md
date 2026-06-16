# Provenance — Project Spec

An agentic research-and-report system. A user submits a research query; a LangGraph
agent plans, searches the web (Tavily), and synthesizes a cited report. A human-in-the-loop
(HITL) gate lets the user approve, edit, or reject the draft — rejection re-runs the
research with the user's feedback. Live agent progress is streamed to the UI.

**Goal:** A polished, deployed portfolio project showcasing agentic AI (LangGraph tool use,
multi-step reasoning, stateful HITL loops) — complementing the existing DocuMind RAG project.

---

## 1. Stack

| Layer | Tech |
|---|---|
| Agent | LangGraph + LangChain + OpenAI |
| Search tool | Tavily |
| Tracing (optional) | LangSmith (1-line env config) |
| Backend | FastAPI (async) |
| Database | Neon (Postgres) |
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| UI | shadcn/ui (new-york style), Tailwind v4, next-themes |
| Auth | Google OAuth (JWT sessions) |
| Deploy | Vercel (frontend) + Render (backend) |

---

## 2. User Flow

1. User logs in with Google.
2. User submits a research query.
3. Agent **plans** → breaks query into 3–5 sub-queries.
4. Agent **searches** → Tavily fetches results per sub-query.
5. Agent **synthesizes** → drafts a structured report with inline citations.
6. **HITL gate** → UI shows the draft. User can:
   - **Approve** → finalize as-is
   - **Edit & Approve** → finalize with user edits
   - **Reject — Re-search** → agent loops back to search with the user's feedback
7. Final report saved and rendered with summary box, sections, and a sources panel.

Live agent progress streams to the UI throughout (SSE).

---

## 3. LangGraph Agent

### Nodes

```
plan → search → synthesize → [HITL interrupt] → finalize
                                   │
                                   └── reject → search (with human feedback)
```

- **plan** — LLM decomposes the query into 3–5 focused sub-queries.
- **search** — Tavily tool call per sub-query (parallel where possible); collects results + source URLs.
- **synthesize** — LLM drafts a structured report (summary + sections), attaches numbered citations mapped to sources.
- **hitl** — `interrupt()` pauses the graph; waits for the user's decision via the review endpoint.
- **finalize** — incorporates approved edits (if any) and writes the final report.

### State (TypedDict / Pydantic)

```python
class ResearchState:
    run_id: str
    query: str
    sub_queries: list[str]
    search_results: list[SearchResult]   # {sub_query, title, url, content}
    draft: str
    citations: list[Citation]            # {n, title, url}
    human_feedback: str | None           # set on reject, fed back into search
    decision: Literal["approve", "edit", "reject"] | None
    final_report: str | None
```

- Use a **checkpointer** (Postgres or in-memory for dev) so the graph can pause at HITL and resume.
- On **reject**, `human_feedback` is injected; the `plan`/`search` nodes use it to refine sub-queries. (Conditional edge after HITL routes reject → search, approve/edit → finalize.)

---

## 4. Backend (FastAPI)

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/google/login` | Start Google OAuth |
| `GET` | `/auth/google/callback` | OAuth callback, issue JWT |
| `POST` | `/research` | Start a run; returns `run_id` |
| `GET` | `/research/{id}/stream` | SSE — live agent progress + node transitions |
| `GET` | `/research/{id}/status` | Current status + node (fallback to stream) |
| `POST` | `/research/{id}/review` | Submit HITL decision (approve / edit / reject + feedback) |
| `GET` | `/research/{id}/report` | Fetch final report |
| `GET` | `/reports` | List the user's past reports |

- Agent runs async in a background task; SSE streams node events as the graph executes.
- When the graph hits `interrupt()`, status becomes `awaiting_review` and the stream emits a `hitl_ready` event with the draft. The `/review` call resumes the graph.
- All endpoints (except auth) require a valid JWT; reports are scoped to `user_id`.

### Run statuses

`pending → planning → searching → synthesizing → awaiting_review → finalizing → complete`
(plus `failed`)

---

## 5. Database (Neon / Postgres)

```sql
users            (id, google_id, email, name, avatar_url, created_at)

research_runs    (id, user_id FK, query, status, current_node,
                  human_feedback, created_at, updated_at)

reports          (id, run_id FK, summary, content_markdown,
                  citations jsonb, word_count, created_at)

hitl_reviews     (id, run_id FK, draft, decision,
                  edited_content, feedback, reviewed_at)
```

- LangGraph checkpoints stored in their own table (Postgres checkpointer) or a separate schema.

---

## 6. Frontend (Next.js)

### Pages

| Route | Purpose |
|---|---|
| `/` | Hero search bar + "Your Reports" card grid |
| `/research/[id]` | Live agent stepper + streaming log; transitions into HITL review panel |
| `/report/[id]` | Final report: summary box, sections with inline citations, sources panel |
| `/login` | Google sign-in |

### `/research/[id]` — the showcase screen

- **Left sidebar**: vertical stepper (Planning → Searching → Synthesizing → Awaiting review → Finalizing) with active spinner + completed checks.
- **Main panel**: streaming agent log (what it's searching, what it found).
- **On HITL**: panel becomes the review interface — rendered draft, editable textarea, three buttons (Approve / Edit & Approve / Reject — Re-search).
- **On reject**: same page, stepper resets, agent re-runs live (feels like a real agentic loop).

### `/report/[id]`

- Title (query) + metadata bar (date, source count, word count).
- Highlighted **summary box** (3–4 sentence TL;DR).
- **Sections** — H2 per sub-topic, prose with inline `[1]`/`[2]` citations.
- Collapsible **sources panel** — numbered list with favicon, title, URL.
- Action bar: Copy markdown · Export PDF (stretch) · Share link.

---

## 7. Theme / UI Direction

Dark, minimal, high-contrast ("engineered" Next.js-style aesthetic — not the warm marketing
look). shadcn does most of this out of the box.

- **Base color**: `zinc` or `neutral` (avoid `slate`).
- **Mode**: dark default + light toggle (next-themes already installed).
- **Accent**: one cyan/indigo for active states + primary buttons, used sparingly.
- **Font**: Geist.
- **Key components**: card, badge, button, textarea, separator, skeleton (streaming loaders),
  sonner (toasts), tabs (report sections).
- **Copy tone**: borrow a little human warmth in microcopy/empty states; keep the visual system sharp.

---

## 8. Scope Boundaries

**In scope:** the agent loop, HITL, streaming, Google auth, report rendering, deploy.

**Out of scope (intentionally):**
- Full evaluation harness (hallucination rate, citation-accuracy scoring) — *stretch goal only*.
- Vector storage / embeddings — Tavily returns text directly; not needed.
- Multi-user collaboration, teams, sharing permissions.

**Stretch goals (only if time allows):** LangSmith tracing dashboard link, PDF export,
a lightweight eval page scoring citation accuracy via LLM-as-judge.

---

## 9. Current State

- **frontend/** — scaffolded: Next.js 16, React 19, shadcn 4, Tailwind v4, next-themes, radix-ui.
- **backend/** — empty; to be built.

---

## 10. Suggested Build Order

1. Backend: FastAPI skeleton + Neon connection + schema/migrations.
2. Agent: LangGraph graph (plan → search → synthesize → finalize) with Tavily, no HITL yet — verify it produces a cited report end to end.
3. Add HITL interrupt + checkpointer + reject loop.
4. Backend endpoints + SSE streaming.
5. Google OAuth (both ends).
6. Frontend: home → research (stepper + stream) → report pages.
7. Polish theme, empty states, deploy.