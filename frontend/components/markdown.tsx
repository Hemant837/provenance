import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

/**
 * Turn inline [n] citation markers inside text nodes into anchor links that
 * jump to the matching source (#source-n). Only applied when linkCitations.
 */
function linkifyCitations(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child
    const parts = child.split(/(\[\d+\])/g)
    return parts.map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/)
      if (!m) return part
      const n = m[1]
      return (
        <a
          key={i}
          href={`#source-${n}`}
          className="mx-0.5 rounded bg-primary/10 px-1 text-xs font-medium text-primary no-underline hover:bg-primary/20"
        >
          {part}
        </a>
      )
    })
  })
}

export function Markdown({
  children,
  className,
  linkCitations = false,
}: {
  children: string
  className?: string
  linkCitations?: boolean
}) {
  const cite = (nodes: React.ReactNode) =>
    linkCitations ? linkifyCitations(nodes) : nodes

  return (
    <div className={cn("text-sm leading-7 text-foreground/90", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 mb-3 text-xl font-semibold first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-2 text-lg font-semibold first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-4">{cite(children)}</p>,
          li: ({ children }) => <li>{cite(children)}</li>,
          ul: ({ children }) => (
            <ul className="mb-4 ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-decimal space-y-1">{children}</ol>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
