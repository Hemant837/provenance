import { z } from "zod"

export const userSchema = z.object({
  id: z.string(),
  // Zod 4: top-level z.email() (the old z.string().email() is deprecated).
  email: z.email(),
  name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
})

export const runSchema = z.object({
  id: z.string(),
  query: z.string(),
  status: z.string(),
  current_node: z.string().nullable().optional(),
  created_at: z.string(),
})

export const citationSchema = z.object({
  n: z.number(),
  title: z.string(),
  url: z.string(),
})

export const reportSchema = z.object({
  run_id: z.string(),
  query: z.string(),
  summary: z.string().nullable(),
  content_markdown: z.string(),
  citations: z.array(citationSchema),
  word_count: z.number(),
  created_at: z.string(),
})

export const reportListItemSchema = z.object({
  run_id: z.string(),
  query: z.string(),
  status: z.string(),
  created_at: z.string(),
  has_report: z.boolean(),
})

export const reportListSchema = z.array(reportListItemSchema)

// --- SSE event payloads ---

export const hitlPayloadSchema = z.object({
  summary: z.string().default(""),
  draft: z.string().default(""),
  citations: z.array(citationSchema).default([]),
})

export type User = z.infer<typeof userSchema>
export type Run = z.infer<typeof runSchema>
export type Citation = z.infer<typeof citationSchema>
export type Report = z.infer<typeof reportSchema>
export type ReportListItem = z.infer<typeof reportListItemSchema>
export type HitlPayload = z.infer<typeof hitlPayloadSchema>

export type ReviewDecision = "approve" | "edit" | "reject"
