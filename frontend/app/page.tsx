"use client"

import dynamic from "next/dynamic"

import { useAuth } from "@/lib/auth"
import { usePageTitle } from "@/hooks/use-page-title"
import { DashboardSkeleton, LandingSkeleton } from "@/components/skeletons"

// Code-split: logged-out visitors load only the landing chunk, logged-in users
// only the dashboard chunk (both render at "/"). Skeletons mirror each layout.
const Landing = dynamic(
  () => import("@/components/landing").then((m) => m.Landing),
  { loading: () => <LandingSkeleton /> },
)
const Dashboard = dynamic(
  () => import("@/components/dashboard").then((m) => m.Dashboard),
  { loading: () => <DashboardSkeleton /> },
)

export default function HomePage() {
  const { user, loading } = useAuth()
  usePageTitle("")

  // Deterministic skeleton during auth resolve (avoids a hydration mismatch).
  if (loading) return <LandingSkeleton />
  return user ? <Dashboard /> : <Landing />
}
