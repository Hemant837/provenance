"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRight, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { createResearch, fetchReports } from "@/lib/api"
import { useRequireAuth } from "@/lib/auth"
import { usePageTitle } from "@/hooks/use-page-title"
import type { ReportListItem } from "@/lib/schemas"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  planning: "Planning",
  searching: "Searching",
  synthesizing: "Synthesizing",
  awaiting_review: "Awaiting review",
  finalizing: "Finalizing",
  complete: "Complete",
  failed: "Failed",
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "complete") return "default"
  if (status === "failed") return "destructive"
  return "secondary"
}

const SUGGESTIONS = [
  "What is Model Context Protocol (MCP) and how are companies adopting it?",
  "How do vector databases differ from traditional databases?",
  "What are the main security risks of giving AI agents tool access?",
]

export default function HomePage() {
  const { user, loading } = useRequireAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [query, setQuery] = React.useState("")
  usePageTitle("")

  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    enabled: !!user,
  })

  const startMutation = useMutation({
    mutationFn: createResearch,
    onSuccess: (run) => {
      void queryClient.invalidateQueries({ queryKey: ["reports"] })
      router.push(`/research/${run.id}`)
    },
    onError: () => toast.error("Could not start research. Try again."),
  })

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 3) {
      toast.error("Enter a research question (at least 3 characters).")
      return
    }
    startMutation.mutate(q)
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="flex flex-col items-center py-16 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            What should I research?
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Provenance plans the work, searches the web, and writes a cited report —
            you review it before it&apos;s final.
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex w-full max-w-2xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. How are small language models being used on-device in 2026?"
                className="h-12 pl-9 text-base"
              />
            </div>
            <Button type="submit" size="lg" className="h-12" disabled={startMutation.isPending}>
              {startMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Research <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={startMutation.isPending}
                onClick={() => setQuery(s)}
                className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Your reports</h2>
          {reportsQuery.isLoading ? (
            <ReportsSkeleton />
          ) : reportsQuery.data && reportsQuery.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reportsQuery.data.map((item) => (
                <ReportCard key={item.run_id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
              <Search className="size-6 text-muted-foreground/60" />
              <p className="text-sm font-medium">No reports yet</p>
              <p className="text-xs text-muted-foreground">
                Ask a research question above — or tap a suggestion to get started.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

function ReportCard({ item }: { item: ReportListItem }) {
  const href = item.status === "complete" ? `/report/${item.run_id}` : `/research/${item.run_id}`
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-base font-medium">{item.query}</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant={statusVariant(item.status)}>
            {STATUS_LABEL[item.status] ?? item.status}
          </Badge>
        </CardContent>
        <CardFooter className="justify-between text-xs text-muted-foreground">
          <span>{new Date(item.created_at).toLocaleDateString()}</span>
          <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </CardFooter>
      </Card>
    </Link>
  )
}

function ReportsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  )
}
