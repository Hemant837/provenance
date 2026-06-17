"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Copy, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { fetchReport } from "@/lib/api"
import { useRequireAuth } from "@/lib/auth"
import { usePageTitle } from "@/hooks/use-page-title"
import { SiteHeader } from "@/components/site-header"
import { Markdown } from "@/components/markdown"
import { SourcesPanel } from "@/components/report/sources-panel"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useRequireAuth()

  const reportQuery = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReport(id),
    enabled: !!user && !!id,
  })

  usePageTitle(reportQuery.data?.query ?? "Report")

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const report = reportQuery.data

  function copyMarkdown() {
    if (!report) return
    void navigator.clipboard.writeText(report.content_markdown)
    toast.success("Report markdown copied.")
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href="/">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>

        {reportQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : reportQuery.isError || !report ? (
          <p className="text-sm text-muted-foreground">
            This report isn&apos;t available.{" "}
            <Link href="/" className="text-primary underline">
              Go home
            </Link>
            .
          </p>
        ) : (
          <article>
            <h1 className="text-2xl font-semibold tracking-tight">{report.query}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{new Date(report.created_at).toLocaleString()}</span>
              <span>·</span>
              <span>{report.citations.length} sources</span>
              <span>·</span>
              <span>{report.word_count} words</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={copyMarkdown}>
                <Copy className="size-3.5" /> Copy markdown
              </Button>
            </div>

            {report.summary && (
              <Card className="mt-6 border-primary/30 bg-primary/5">
                <CardContent className="py-4 text-sm leading-7">{report.summary}</CardContent>
              </Card>
            )}

            <div className="mt-6">
              <Markdown linkCitations>{report.content_markdown}</Markdown>
            </div>

            <Separator className="my-8" />

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="size-4" /> Sources ({report.citations.length})
              </h2>
              <SourcesPanel citations={report.citations} />
            </section>
          </article>
        )}
      </main>
    </>
  )
}
