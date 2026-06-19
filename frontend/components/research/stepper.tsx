import * as React from "react"
import { Check, Circle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export const STEPS = [
  { key: "plan", label: "Planning" },
  { key: "search", label: "Searching the web" },
  { key: "synthesize", label: "Synthesizing" },
  { key: "review", label: "Awaiting your review" },
  { key: "finalize", label: "Finalizing" },
] as const

export type StepKey = (typeof STEPS)[number]["key"]
export type StepStatus = "pending" | "active" | "done"

export const Stepper = React.memo(function Stepper({
  statuses,
}: {
  statuses: Record<StepKey, StepStatus>
}) {
  return (
    <ol className="space-y-1">
      {STEPS.map((step) => {
        const status = statuses[step.key]
        return (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
              status === "active" && "bg-primary/10 text-foreground",
              status === "pending" && "text-muted-foreground",
            )}
          >
            <span className="flex size-5 items-center justify-center">
              {status === "done" && <Check className="size-4 text-primary" />}
              {status === "active" && <Loader2 className="size-4 animate-spin text-primary" />}
              {status === "pending" && <Circle className="size-3 text-muted-foreground/50" />}
            </span>
            <span className={cn(status === "done" && "text-foreground")}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
})
