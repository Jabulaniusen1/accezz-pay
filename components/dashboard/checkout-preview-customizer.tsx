"use client"

import { useMemo, useState, useTransition } from "react"
import { FiDroplet, FiRefreshCcw, FiType, FiSave } from "react-icons/fi"

import { CheckoutClient } from "@/components/checkout/checkout-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Organizer, Product, TicketType } from "@/types/database"
import { updateBrandingAction } from "@/app/dashboard/events/actions"

type CheckoutPreviewCustomizerProps = {
  organizer: Organizer
  product: Product
  ticketTypes: TicketType[]
}

const fontOptions = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Manrope", value: '"Manrope", system-ui, sans-serif' },
  { label: "Poppins", value: '"Poppins", system-ui, sans-serif' },
  { label: "Work Sans", value: '"Work Sans", system-ui, sans-serif' },
]

const quickThemes = [
  {
    id: "royal",
    name: "Royal Orchid",
    primary: "#6B21A8",
    secondary: "#F3E8FF",
    font: "Inter, system-ui, sans-serif",
  },
  {
    id: "ocean",
    name: "Ocean Wave",
    primary: "#1D4ED8",
    secondary: "#DBEAFE",
    font: '"Work Sans", system-ui, sans-serif',
  },
  {
    id: "sunrise",
    name: "Sunrise Glow",
    primary: "#F97316",
    secondary: "#FFEAD5",
    font: '"Poppins", system-ui, sans-serif',
  },
  {
    id: "forest",
    name: "Forest Mist",
    primary: "#047857",
    secondary: "#DCFCE7",
    font: '"Manrope", system-ui, sans-serif',
  },
]

export function CheckoutPreviewCustomizer({ organizer, product, ticketTypes }: CheckoutPreviewCustomizerProps) {
  const initialBranding = (organizer.branding ?? {}) as Record<string, string | undefined>
  const defaultPrimary = initialBranding.primaryColor ?? "#6B21A8"
  const defaultSecondary = initialBranding.secondaryColor ?? "#F3E8FF"
  const defaultFont = initialBranding.fontFamily ?? "Inter, system-ui, sans-serif"

  const [primaryColor, setPrimaryColor] = useState(defaultPrimary)
  const [secondaryColor, setSecondaryColor] = useState(defaultSecondary)
  const [fontFamily, setFontFamily] = useState(defaultFont)
  const [showLogo, setShowLogo] = useState(Boolean(initialBranding.logoUrl))
  const [isPending, startTransition] = useTransition()
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const customOrganizer: Organizer = useMemo(() => {
    return {
      ...organizer,
      branding: {
        ...(organizer.branding ?? {}),
        primaryColor,
        secondaryColor,
        fontFamily,
        logoUrl: showLogo ? (initialBranding.logoUrl ?? undefined) : undefined,
      },
    }
  }, [organizer, primaryColor, secondaryColor, fontFamily, showLogo, initialBranding.logoUrl])

  const handleReset = () => {
    setPrimaryColor(defaultPrimary)
    setSecondaryColor(defaultSecondary)
    setFontFamily(defaultFont)
    setShowLogo(Boolean(initialBranding.logoUrl))
  }

  const handleSave = () => {
    setSaveMessage(null)
    const payload = {
      primaryColor,
      secondaryColor,
      fontFamily,
      logoUrl: showLogo ? initialBranding.logoUrl ?? null : null,
    }

    startTransition(async () => {
      try {
        await updateBrandingAction({
          organizerId: organizer.id,
          primaryColor: payload.primaryColor,
          secondaryColor: payload.secondaryColor,
          fontFamily: payload.fontFamily,
          logoUrl: payload.logoUrl,
        })
        setSaveMessage("Branding updated successfully.")
      } catch (error) {
        console.error("updateBrandingAction", error)
        setSaveMessage("Unable to save branding. Try again later.")
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
      <div className="space-y-6 rounded-3xl border border-border bg-card/80 p-5 shadow-inner">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Customize</p>
            <h3 className="text-lg font-semibold text-foreground">Preview Controls</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSave}
              disabled={isPending}
            >
              <FiSave className="h-4 w-4" />
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2 text-foreground/70 hover:text-foreground">
              <FiRefreshCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preview-primary" className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <FiDroplet className="h-4 w-4" /> Primary color
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="preview-primary"
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="h-12 w-16 cursor-pointer rounded-2xl border border-border bg-background p-1"
              />
              <Input
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview-secondary" className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <FiDroplet className="h-4 w-4 text-foreground/60" /> Secondary color
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="preview-secondary"
                type="color"
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
                className="h-12 w-16 cursor-pointer rounded-2xl border border-border bg-background p-1"
              />
              <Input
                value={secondaryColor}
                onChange={(event) => setSecondaryColor(event.target.value)}
                className="font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <FiType className="h-4 w-4" /> Heading font
            </Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose font" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span style={{ fontFamily: option.value }}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-dashed border-border/80 bg-background px-4 py-3 text-sm text-foreground/70">
            <span>Show organizer logo</span>
            <input
              type="checkbox"
              checked={showLogo}
              onChange={(event) => setShowLogo(event.target.checked)}
              className="h-5 w-5 cursor-pointer rounded border border-border bg-card"
            />
          </div>

          {saveMessage && <p className="text-xs text-foreground/60">{saveMessage}</p>}
          {!saveMessage && !isPending && (
            <p className="text-xs text-foreground/60">
              Adjust the preview and hit save to update organizer branding instantly.
            </p>
          )}

          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Quick themes</p>
            <div className="grid grid-cols-2 gap-3">
              {quickThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(theme.primary)
                    setSecondaryColor(theme.secondary)
                    setFontFamily(theme.font)
                  }}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2 text-left transition hover:border-[color:var(--brand-primary)]/30 hover:shadow-sm"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70" style={{ background: theme.primary }} />
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border/70" style={{ background: theme.secondary }} />
                  <div className="ml-1">
                    <p className="text-xs font-semibold text-foreground">{theme.name}</p>
                    <p className="text-[11px] text-foreground/60">{theme.font.split(",")[0].replace(/"/g, "")}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FF605C]" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD44]" />
            <span className="h-3 w-3 rounded-full bg-[#00CA4E]" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Checkout Preview</p>
          <span className="h-6 w-20 rounded-full bg-border" />
        </div>
        <div className="p-4 sm:p-6">
          <div className="rounded-2xl border border-border/60 bg-background shadow-inner">
            <CheckoutClient organizer={customOrganizer} product={product} ticketTypes={ticketTypes} preview redirectUrl={null} />
          </div>
        </div>
      </div>
    </div>
  )
}
