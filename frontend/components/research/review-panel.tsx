"use client"

import * as React from "react"
import { Check, Pencil, RefreshCw } from "lucide-react"

import type { HitlPayload, ReviewDecision } from "@/lib/schemas"
import { Markdown } from "@/components/markdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

type Props = {
  payload: HitlPayload
  busy: boolean
  onDecision: (decision: ReviewDecision, text: string) => void
}

export const ReviewPanel = React.memo(function ReviewPanel({
  payload,
  busy,
  onDecision,
}: Props) {
  const [mode, setMode] = React.useState<"none" | "edit" | "reject">("none")
  const [editText, setEditText] = React.useState(payload.draft)
  const [feedback, setFeedback] = React.useState("")

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">Review the draft</CardTitle>
        <p className="text-sm text-muted-foreground">
          {payload.citations.length} sources gathered. Approve it, edit it, or send it
          back with feedback to re-research.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "edit" ? (
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="min-h-72 font-mono text-xs"
          />
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/30 p-4">
            <Markdown>{payload.draft}</Markdown>
          </div>
        )}

        {mode === "reject" && (
          <Textarea
            autoFocus
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should the agent do differently? e.g. focus on production trade-offs, add recent 2026 sources…"
            className="min-h-24"
          />
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          {mode === "none" && (
            <>
              <Button onClick={() => onDecision("approve", "")} disabled={busy}>
                <Check className="size-4" /> Approve
              </Button>
              <Button variant="outline" onClick={() => setMode("edit")} disabled={busy}>
                <Pencil className="size-4" /> Edit &amp; approve
              </Button>
              <Button variant="outline" onClick={() => setMode("reject")} disabled={busy}>
                <RefreshCw className="size-4" /> Reject — re-research
              </Button>
            </>
          )}

          {mode === "edit" && (
            <>
              <Button onClick={() => onDecision("edit", editText)} disabled={busy}>
                <Check className="size-4" /> Save &amp; approve
              </Button>
              <Button variant="ghost" onClick={() => setMode("none")} disabled={busy}>
                Cancel
              </Button>
            </>
          )}

          {mode === "reject" && (
            <>
              <Button
                onClick={() => onDecision("reject", feedback)}
                disabled={busy || feedback.trim().length === 0}
              >
                <RefreshCw className="size-4" /> Re-research with feedback
              </Button>
              <Button variant="ghost" onClick={() => setMode("none")} disabled={busy}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
