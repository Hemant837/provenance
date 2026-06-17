"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { setToken } from "@/lib/api"
import { useAuth } from "@/lib/auth"

function CallbackInner() {
  const params = useSearchParams()
  const router = useRouter()
  const { refresh } = useAuth()

  React.useEffect(() => {
    const token = params.get("token")
    if (!token) {
      router.replace("/login")
      return
    }
    setToken(token)
    void refresh().then(() => router.replace("/"))
  }, [params, refresh, router])

  return (
    <main className="flex min-h-svh items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Signing you in…
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense fallback={null}>
      <CallbackInner />
    </React.Suspense>
  )
}
