import * as React from "react"

/** Sets document.title for client pages (App Router metadata can't run in client components). */
export function usePageTitle(title: string) {
  React.useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · Provenance` : "Provenance"
    return () => {
      document.title = previous
    }
  }, [title])
}
