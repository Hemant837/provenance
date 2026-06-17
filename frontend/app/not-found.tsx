import Link from "next/link"
import { FlaskConical } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <FlaskConical className="size-6 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          That page doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </main>
  )
}
