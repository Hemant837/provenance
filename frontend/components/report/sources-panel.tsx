import * as React from "react"
import { ExternalLink } from "lucide-react"

import type { Citation } from "@/lib/schemas"

function favicon(url: string) {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch {
    return undefined
  }
}

export const SourcesPanel = React.memo(function SourcesPanel({
  citations,
}: {
  citations: Citation[]
}) {
  return (
    <ol className="space-y-2">
      {citations.map((c) => (
        <li
          key={c.n}
          id={`source-${c.n}`}
          className="flex scroll-mt-20 items-start gap-3 rounded-md border p-3 text-sm transition-colors target:border-primary target:bg-primary/5"
        >
          <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground">
            [{c.n}]
          </span>
          {favicon(c.url) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon(c.url)} alt="" className="mt-0.5 size-4 shrink-0 rounded-sm" />
          )}
          <a
            href={c.url}
            target="_blank"
            rel="noreferrer"
            className="group min-w-0 flex-1 hover:text-primary"
          >
            <span className="block font-medium">{c.title}</span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{c.url}</span>
              <ExternalLink className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
})
