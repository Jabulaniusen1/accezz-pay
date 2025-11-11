"use client"

import { useEffect, useState } from "react"

type ReceiptAutoDownloaderProps = {
  reference: string | null
}

export function ReceiptAutoDownloader({ reference }: ReceiptAutoDownloaderProps) {
  const [status, setStatus] = useState<"idle" | "downloading" | "ready" | "error">(reference ? "downloading" : "idle")
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!reference) {
      return
    }

    const abortController = new AbortController()

    async function fetchReceipt() {
      try {
        setStatus("downloading")
        setError(null)

        const response = await fetch(`/api/orders/${reference}/receipt`, {
          signal: abortController.signal,
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to download receipt (${response.status})`)
        }

        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        const filename = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ?? `receipt-${reference}.pdf`
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        setStatus("ready")
      } catch (err) {
        if (abortController.signal.aborted) return
        const message = err instanceof Error ? err.message : "Unable to download receipt."
        setError(message)
        setStatus("error")
      }
    }

    fetchReceipt()

    return () => {
      abortController.abort()
    }
  }, [reference, attempt])

  const retry = () => {
    if (!reference) return
    setAttempt((prev) => prev + 1)
  }

  return (
    <div className="space-y-2">
      {status === "downloading" && <p className="text-sm text-foreground/70">Preparing your receipt…</p>}
      {status === "ready" && <p className="text-sm text-foreground/70">Receipt downloaded. Check your device&apos;s downloads folder.</p>}
      {status === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">We couldn&apos;t download your receipt automatically.</p>
          <button
            type="button"
            onClick={retry}
            className="text-sm underline text-[color:var(--brand-primary,#6B21A8)]"
          >
            Try again
          </button>
          {error && <p className="text-xs text-foreground/60">{error}</p>}
        </div>
      )}
    </div>
  )
}


