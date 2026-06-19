import { Skeleton } from "@/components/ui/skeleton"

/** A header bar placeholder (matches the real sticky header height). */
function HeaderSkeleton() {
  return (
    <div className="h-14 border-b border-border/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </div>
  )
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="flex flex-col items-center gap-4 py-16">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="mt-4 h-12 w-full max-w-2xl rounded-md" />
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-48 rounded-full" />
            ))}
          </div>
        </section>
        <Skeleton className="mb-4 h-4 w-24" />
        <CardGridSkeleton />
      </main>
    </>
  )
}

export function ResearchSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="mb-6 h-6 w-80 max-w-full" />
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </main>
    </>
  )
}

export function ReportSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-20" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="mt-3 h-4 w-64" />
        <Skeleton className="mt-6 h-20 w-full rounded-lg" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="mt-8 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </main>
    </>
  )
}

/** Lightweight placeholder while the landing chunk loads. */
export function LandingSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24">
        <Skeleton className="h-12 w-full max-w-xl" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="mt-4 h-11 w-44 rounded-md" />
      </main>
    </>
  )
}
