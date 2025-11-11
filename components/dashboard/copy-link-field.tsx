"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

type CopyLinkFieldProps = {
  label: string
  value: string
}

export function CopyLinkField({ label, value }: CopyLinkFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link", error)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex gap-2 bg-background p-3 rounded-lg border border-border">
        <input type="text" value={value} readOnly className="flex-1 bg-transparent text-foreground outline-none" />
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  )
}

