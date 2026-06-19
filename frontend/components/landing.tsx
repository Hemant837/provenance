"use client"

import { useTheme } from "next-themes"
import {
  Activity,
  ArrowRight,
  ExternalLink,
  FileText,
  FlaskConical,
  GitBranch,
  LineChart,
  Moon,
  Quote,
  Search,
  Sun,
  UserCheck,
} from "lucide-react"

import { googleLoginUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const GITHUB_URL = "https://github.com/Hemant837/provenance"

const STEPS = [
  { icon: Search, title: "Ask a question", body: "Pose any research question you'd normally open ten tabs for." },
  { icon: GitBranch, title: "The agent researches", body: "It plans focused sub-questions and searches the web with Tavily." },
  { icon: UserCheck, title: "You review", body: "Approve the draft, edit it, or send it back with feedback to re-research." },
  { icon: FileText, title: "Get a cited report", body: "A structured report with inline citations and a full source list." },
]

const FEATURES = [
  { icon: GitBranch, title: "Agentic, not a single prompt", body: "A multi-step LangGraph agent that plans, searches, and synthesizes — with a branching re-research loop." },
  { icon: Activity, title: "Watch it think, live", body: "Every step streams to your screen in real time over Server-Sent Events." },
  { icon: UserCheck, title: "Human-in-the-loop gate", body: "Nothing is final until you approve it. Reject with feedback and the agent tries again." },
  { icon: Quote, title: "Cited, traceable answers", body: "Inline [n] citations link to the exact sources that informed each claim." },
  { icon: LineChart, title: "Observable", body: "Instrumented with LangSmith for full run tracing — every call, token, and latency." },
]

function Nav() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <FlaskConical className="size-5 text-primary" />
          <span>Provenance</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </Button>
          <Button asChild>
            <a href={googleLoginUrl()}>Sign in</a>
          </Button>
        </div>
      </div>
    </nav>
  )
}

export function Landing() {
  return (
    <div className="min-h-svh">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-primary/10 to-transparent" />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
            <FlaskConical className="size-3.5 text-primary" />
            Agentic research with receipts
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Research you can trust, with the sources to prove it.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground">
            Provenance is an AI research agent that plans, searches the web, and writes
            a fully cited report — and pauses for your review before anything is final.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <a href={googleLoginUrl()}>
                Continue with Google <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="relative h-full">
              <CardContent className="pt-6">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="size-4 text-primary" />
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="mt-1 font-medium">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          What&apos;s happening under the hood
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="h-full">
              <CardContent className="pt-6">
                <f.icon className="size-5 text-primary" />
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Ready to try it?</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Sign in and run your first research question — watch the agent work, then
              review the result.
            </p>
            <Button asChild size="lg">
              <a href={googleLoginUrl()}>
                Continue with Google <ArrowRight className="size-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 text-primary" />
            <span>Provenance</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <ExternalLink className="size-4" /> GitHub
            </a>
            <span>Built by Hemant Verma</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
