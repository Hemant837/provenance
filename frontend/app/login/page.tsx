"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FlaskConical } from "lucide-react"
import { toast } from "sonner"

import { devLogin, googleLoginUrl, setToken } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/hooks/use-page-title"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, refresh } = useAuth()
  const [devBusy, setDevBusy] = React.useState(false)

  usePageTitle("Sign in")

  React.useEffect(() => {
    if (!loading && user) router.replace("/")
  }, [loading, user, router])

  async function handleDevLogin() {
    setDevBusy(true)
    try {
      setToken(await devLogin())
      await refresh()
      router.replace("/")
    } catch {
      toast.error(
        "Dev login failed. Is the backend running in development mode?"
      )
    } finally {
      setDevBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <FlaskConical className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Welcome to Provenance</CardTitle>
          <CardDescription>
            Agentic web research with cited reports and a human-in-the-loop
            review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg">
            <a href={googleLoginUrl()}>Continue with Google</a>
          </Button>
          {/* Dev-only shortcut — hidden in production builds. */}
          {process.env.NODE_ENV !== "production" && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={handleDevLogin}
                disabled={devBusy}
              >
                {devBusy ? "Signing in…" : "Continue as dev"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                “Continue as dev” works only while the backend runs in development.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
