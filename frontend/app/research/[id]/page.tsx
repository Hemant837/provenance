"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  apiErrorMessage,
  createResearch,
  fetchRun,
  streamUrl,
  submitReview,
} from "@/lib/api"
import {
  hitlPayloadSchema,
  type HitlPayload,
  type ReviewDecision,
} from "@/lib/schemas"
import { useRequireAuth } from "@/lib/auth"
import { usePageTitle } from "@/hooks/use-page-title"
import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/site-header"
import {
  Stepper,
  STEPS,
  type StepKey,
  type StepStatus,
} from "@/components/research/stepper"
import { ReviewPanel } from "@/components/research/review-panel"
import { ResearchSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function stagesUpTo(
  active: StepKey,
  done = false
): Record<StepKey, StepStatus> {
  const activeIdx = STEPS.findIndex((s) => s.key === active)
  const out = {} as Record<StepKey, StepStatus>
  STEPS.forEach((s, i) => {
    out[s.key] = done
      ? "done"
      : i < activeIdx
        ? "done"
        : i === activeIdx
          ? "active"
          : "pending"
  })
  return out
}

// Map a backend run status to the stepper stage (used on first load / reconnect).
function statusToStages(status: string): Record<StepKey, StepStatus> {
  switch (status) {
    case "searching":
      return stagesUpTo("search")
    case "synthesizing":
      return stagesUpTo("synthesize")
    case "awaiting_review":
      return stagesUpTo("review")
    case "finalizing":
      return stagesUpTo("finalize")
    case "complete":
      return stagesUpTo("finalize", true)
    default:
      return stagesUpTo("plan")
  }
}

export default function ResearchPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [title, setTitle] = React.useState("")
  const [statuses, setStatuses] = React.useState(() => stagesUpTo("plan"))
  const [logs, setLogs] = React.useState<string[]>([])
  const [hitl, setHitl] = React.useState<HitlPayload | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [retrying, setRetrying] = React.useState(false)

  usePageTitle(title || "Researching")

  const doneRef = React.useRef(false)
  const logEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  // SSE connection — drives the run and live UI.
  React.useEffect(() => {
    if (!user || !id) return

    let es: EventSource | null = null

    fetchRun(id)
      .then((run) => {
        setTitle(run.query)
        setStatuses(statusToStages(run.status))
        if (run.status === "complete") {
          router.replace(`/report/${id}`)
          return
        }
        es = new EventSource(streamUrl(id))
        es.onmessage = (e) => handleEvent(JSON.parse(e.data))
      })
      .catch(() => toast.error("Could not load this research run."))

    function handleEvent(ev: { event: string; data: unknown }) {
      switch (ev.event) {
        case "status": {
          const s = (ev.data as { status?: string })?.status
          if (s) setStatuses(statusToStages(s))
          break
        }
        case "log": {
          const msg = (ev.data as { message?: string })?.message
          if (msg) setLogs((l) => [...l, msg])
          break
        }
        case "plan":
          setStatuses(stagesUpTo("search"))
          break
        case "search":
          setStatuses(stagesUpTo("synthesize"))
          break
        case "synthesized":
          setStatuses(stagesUpTo("review"))
          break
        case "hitl_ready":
          setFailed(false)
          setHitl(hitlPayloadSchema.parse(ev.data))
          setStatuses(stagesUpTo("review"))
          break
        case "complete":
          doneRef.current = true
          setStatuses(stagesUpTo("finalize", true))
          void queryClient.invalidateQueries({ queryKey: ["reports"] })
          es?.close()
          router.replace(`/report/${id}`)
          break
        case "error":
          setFailed(true)
          setHitl(null)
          es?.close()
          break
      }
    }

    return () => es?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  const onDecision = React.useCallback(
    async (decision: ReviewDecision, text: string) => {
      setBusy(true)
      try {
        await submitReview(id, {
          decision,
          edited_content: decision === "edit" ? text : undefined,
          feedback: decision === "reject" ? text : undefined,
        })
        setHitl(null)
        if (decision === "reject") {
          setLogs((l) => [...l, "— Re-researching with your feedback —"])
          setStatuses(stagesUpTo("plan"))
        } else {
          setStatuses(stagesUpTo("finalize"))
        }
      } catch {
        toast.error("Could not submit your review.")
      } finally {
        setBusy(false)
      }
    },
    [id]
  )

  async function onRetry() {
    setRetrying(true)
    try {
      const run = await createResearch(title)
      router.replace(`/research/${run.id}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not start a new run."))
      setRetrying(false)
    }
  }

  if (loading || !user) {
    return <ResearchSkeleton />
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-lg font-medium">{title || "Researching…"}</h1>

        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="md:sticky md:top-20 md:self-start">
            <Stepper statuses={statuses} />
          </aside>

          <div className="space-y-6">
            {failed ? (
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="size-4 text-destructive" />
                    This run didn&apos;t finish
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A web search or model call failed. You can try the same
                    question again.
                  </p>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button onClick={onRetry} disabled={retrying || !title}>
                    {retrying ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Try again"
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => router.replace("/")}>
                    Back home
                  </Button>
                </CardContent>
              </Card>
            ) : hitl ? (
              <ReviewPanel payload={hitl} busy={busy} onDecision={onDecision} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Agent activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-112 space-y-1.5 overflow-y-auto font-mono text-xs text-muted-foreground">
                    {logs.length === 0 ? (
                      <p className="flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin" /> Working…
                      </p>
                    ) : (
                      logs.map((line, i) => (
                        <p
                          key={i}
                          className={cn(
                            "flex gap-2",
                            i === logs.length - 1 && "text-foreground"
                          )}
                        >
                          <span className="text-primary select-none">›</span>
                          {line}
                        </p>
                      ))
                    )}
                    <div ref={logEndRef} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
