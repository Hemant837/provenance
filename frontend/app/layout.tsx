import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { Providers } from "@/components/providers"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Provenance — Agentic Research",
  description:
    "An agentic research assistant that plans, searches the web, and writes cited reports with a human-in-the-loop review.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
