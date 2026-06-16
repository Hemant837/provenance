import axios from "axios"

import {
  reportListSchema,
  reportSchema,
  runSchema,
  userSchema,
  type ReviewDecision,
} from "@/lib/schemas"

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const TOKEN_KEY = "provenance_token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export const http = axios.create({ baseURL: API_URL })

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- typed, validated calls ---

export async function fetchMe() {
  const { data } = await http.get("/auth/me")
  return userSchema.parse(data)
}

export async function fetchReports() {
  const { data } = await http.get("/reports")
  return reportListSchema.parse(data)
}

export async function fetchRun(runId: string) {
  const { data } = await http.get(`/research/${runId}/status`)
  return runSchema.parse(data)
}

export async function fetchReport(runId: string) {
  const { data } = await http.get(`/research/${runId}/report`)
  return reportSchema.parse(data)
}

export async function createResearch(query: string) {
  const { data } = await http.post("/research", { query })
  return runSchema.parse(data)
}

export async function submitReview(
  runId: string,
  body: { decision: ReviewDecision; edited_content?: string; feedback?: string },
) {
  const { data } = await http.post(`/research/${runId}/review`, body)
  return runSchema.parse(data)
}

export async function devLogin() {
  const { data } = await http.post("/auth/dev-token")
  return data.access_token as string
}

// --- auth + SSE URLs ---

export function googleLoginUrl() {
  return `${API_URL}/auth/google/login`
}

export function streamUrl(runId: string) {
  const token = getToken()
  return `${API_URL}/research/${runId}/stream?token=${encodeURIComponent(token ?? "")}`
}
