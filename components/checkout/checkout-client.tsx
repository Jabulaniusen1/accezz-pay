"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, ShieldCheck, Smartphone, TicketIcon, User, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn, formatCurrencyFromCents, formatDate } from "@/lib/utils"
import type { Organizer, TicketType, Product } from "@/types/database"
import { createCheckoutSession } from "@/app/checkout/actions"

type CheckoutClientProps = {
  organizer: Organizer
  product: Product
  ticketTypes: TicketType[]
  redirectUrl?: string | null
  preview?: boolean
}

export function CheckoutClient({ organizer, product, ticketTypes, redirectUrl, preview = false }: CheckoutClientProps) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketTypes[0]?.id ?? null)
  const [quantity, setQuantity] = useState(1)
  const [buyerName, setBuyerName] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const selectedTicket = ticketTypes.find((ticket) => ticket.id === selectedTicketId) ?? null
  const maxQuantity = selectedTicket ? Math.min(selectedTicket.quantity_available, 10) : 10

  const totalCents = selectedTicket ? selectedTicket.price_cents * quantity : 0

  const branding = organizer.branding ?? {}
  const themeVariables = useMemo(() => {
    return {
      "--brand-primary": (branding.primaryColor as string) ?? "#6B21A8",
      "--brand-secondary": (branding.secondaryColor as string) ?? "#F3E8FF",
      "--brand-font": (branding.fontFamily as string) ?? "Inter, system-ui, sans-serif",
    } as React.CSSProperties
  }, [branding])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!selectedTicket) {
      setError("Select a ticket type to continue.")
      return
    }

    if (preview) {
      setError("Checkout is disabled in preview mode. Open the hosted link to complete a real purchase.")
      return
    }

    startTransition(async () => {
      try {
        const form = new FormData()
        form.set("organizer_id", organizer.id)
        form.set("product_id", product.id)
        form.set("ticket_type_id", selectedTicket.id)
        form.set("quantity", quantity.toString())
        form.set("buyer_name", buyerName)
        form.set("buyer_email", buyerEmail)
        if (buyerPhone) {
          form.set("buyer_phone", buyerPhone)
        }
        if (redirectUrl) {
          form.set("redirect_url", redirectUrl)
        }

        const session = await createCheckoutSession(form)
        if (session.authorizationUrl.startsWith("http")) {
          window.location.href = session.authorizationUrl
        } else {
          router.push(session.authorizationUrl)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to start checkout"
        setError(message)
      }
    })
  }

  return (
    <div className={cn(preview ? "p-6" : "min-h-screen p-4")} style={themeVariables}>
      <div className={cn("mx-auto grid gap-8", preview ? "lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]" : "max-w-6xl lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] py-12")}> 
        <div className={cn("space-y-6", preview ? "" : "lg:pl-2")}> 
          <div className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card/90 px-4 py-3 shadow-sm">
            {typeof branding.logoUrl === "string" && branding.logoUrl.length > 0 ? (
              <Image src={branding.logoUrl} alt={organizer.name} width={48} height={48} className="rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[color:var(--brand-secondary)] flex items-center justify-center text-lg font-semibold text-[color:var(--brand-primary)]">
                {organizer.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-medium text-foreground" style={{ fontFamily: "var(--brand-font)" }}>
              {organizer.name}
            </span>
          </div>

          <div className="space-y-6 rounded-3xl border border-border/60 bg-card/90 px-6 py-6 shadow-sm">
            <div className="flex items-center gap-3">
              <TicketIcon className="h-6 w-6 text-[color:var(--brand-primary)]" />
              <h1 className="text-4xl font-bold text-foreground" style={{ fontFamily: "var(--brand-font)" }}>
              {product.title}
              </h1>
            </div>
            {product.description && <p className="text-foreground/70 leading-relaxed">{product.description}</p>}
            <div className="grid gap-4 md:grid-cols-3">
              {product.start_at && (
                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-white/90 p-4">
                  <Calendar className="absolute -top-6 -right-6 h-24 w-24 text-[color:var(--brand-primary)]/10" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Starts</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatDate(product.start_at)}</p>
                </div>
              )}
              {product.end_at && (
                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-white/90 p-4">
                  <Calendar className="absolute -top-6 -right-6 h-24 w-24 text-[color:var(--brand-primary)]/10" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Ends</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{formatDate(product.end_at)}</p>
                </div>
              )}
              {product.venue?.name && (
                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-white/90 p-4">
                  <MapPin className="absolute -top-6 -right-6 h-24 w-24 text-[color:var(--brand-primary)]/10" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Venue</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{product.venue.name}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-border/60 bg-card/90 px-6 py-6 shadow-sm">
            <div className="flex items-center gap-3">
              <TicketIcon className="h-5 w-5 text-[color:var(--brand-primary)]" />
              <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--brand-font)" }}>
                Select Tickets
              </h2>
            </div>
            <div className="space-y-4">
              {ticketTypes.map((ticket) => {
                const isSelected = selectedTicketId === ticket.id
                const priceLabel = formatCurrencyFromCents(ticket.price_cents, ticket.currency)
                const ticketDescription = ticket.description ?? `SKU: ${ticket.sku}`

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    disabled={ticket.quantity_available <= 0}
                    className={cn(
                      "relative w-full overflow-hidden rounded-[28px] border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)]/40",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      isSelected
                        ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-secondary)]/40 shadow-[0_18px_40px_-28px_rgba(107,33,168,0.6)]"
                        : "border-transparent bg-card hover:border-[color:var(--brand-primary)]/30 hover:shadow-[0_12px_34px_-30px_rgba(15,23,42,0.75)]"
                    )}
                  >
                    <div className="flex items-stretch">
                      <div className="flex flex-1 items-center gap-4 p-5 pr-6">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl text-lg",
                            isSelected
                              ? "bg-[color:var(--brand-primary)] text-white shadow-[0_8px_16px_-12px_rgba(107,33,168,0.8)]"
                              : "bg-[color:var(--brand-secondary)] text-[color:var(--brand-primary)]"
                          )}
                        >
                          <TicketIcon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--brand-font)" }}>
                            {ticket.name}
                          </p>
                          <p className="text-sm text-foreground/70" style={{ fontFamily: "var(--brand-font)" }}>
                            {ticketDescription}
                          </p>
                          <p className="text-xs text-foreground/60" style={{ fontFamily: "var(--brand-font)" }}>
                            {ticket.quantity_available} of {ticket.quantity_total} remaining
                          </p>
                        </div>
                      </div>

                      <div className="relative hidden w-auto min-w-[140px] shrink-0 items-center justify-center bg-white/75 pr-5 sm:flex">
                        <div className="absolute inset-y-4 left-0 w-px border-l border-dashed border-[color:var(--brand-primary)]/30" />
                        <div className="absolute top-6 -left-2 h-6 w-6 rounded-full border border-[color:var(--brand-primary)]/20 bg-card" />
                        <div className="absolute bottom-6 -left-2 h-6 w-6 rounded-full border border-[color:var(--brand-primary)]/20 bg-card" />
                        <p
                          className="ml-6 text-2xl font-bold text-[color:var(--brand-primary)]"
                          style={{ fontFamily: "var(--brand-font)" }}
                        >
                          {priceLabel}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end px-5 pb-4 sm:hidden">
                      <span className="text-lg font-semibold text-[color:var(--brand-primary)]" style={{ fontFamily: "var(--brand-font)" }}>
                        {priceLabel}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className={cn(preview ? "" : "lg:col-span-1")}> 
          <Card className="sticky top-6 border border-[color:var(--brand-primary)]/30 shadow-xl shadow-[color:var(--brand-primary)]/10">
            <CardContent className="pt-6 space-y-6">
              {preview && (
                <div className="rounded-lg border border-dashed border-[color:var(--brand-primary)]/60 bg-[color:var(--brand-secondary)]/20 p-3 text-xs text-[color:var(--brand-primary)]">
                  Preview only — payments are disabled in this embedded view.
                </div>
              )}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground" style={{ fontFamily: "var(--brand-font)" }}>
                    Order Summary
                  </h3>
                  <ShieldCheck className="h-4 w-4 text-[color:var(--brand-primary)]" />
                </div>
                {selectedTicket ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/70">Ticket</span>
                      <span className="font-semibold text-foreground">{selectedTicket.name}</span>
                    </div>
                    <div className="mt-3">
                      <Label htmlFor="quantity" className="text-sm text-foreground/70">
                        Quantity
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          disabled={quantity <= 1 || isPending}
                        >
                          −
                        </Button>
                        <span className="w-10 text-center font-semibold text-foreground">{quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity((prev) => Math.min(maxQuantity, prev + 1))}
                          disabled={quantity >= maxQuantity || isPending}
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-xs text-foreground/60 mt-1">Max {maxQuantity} per order</p>
                    </div>
                    <div className="flex justify-between items-center border-t border-border mt-4 pt-4">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-2xl font-bold text-[color:var(--brand-primary)]" style={{ fontFamily: "var(--brand-font)" }}>
                        {formatCurrencyFromCents(totalCents, selectedTicket.currency)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-foreground/70">Choose a ticket type to continue.</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buyer_name">Full Name</Label>
                  <Input
                    id="buyer_name"
                    placeholder="Jane Doe"
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer_email">Email</Label>
                  <Input
                    id="buyer_email"
                    type="email"
                    placeholder="jane@example.com"
                    value={buyerEmail}
                    onChange={(event) => setBuyerEmail(event.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer_phone" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-foreground/60" /> Phone (optional)
                  </Label>
                  <Input
                    id="buyer_phone"
                    placeholder="+2348000000000"
                    value={buyerPhone}
                    onChange={(event) => setBuyerPhone(event.target.value)}
                    disabled={isPending}
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={preview || isPending || !selectedTicket}
                  style={{ backgroundColor: "var(--brand-primary)", color: "#fff" }}
                >
                  {preview ? "Preview Mode" : isPending ? "Initializing payment..." : `Pay ${formatCurrencyFromCents(totalCents, selectedTicket?.currency ?? "NGN")}`}
                </Button>

                <div className="flex flex-col items-center gap-2 text-xs text-foreground/60">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[color:var(--brand-primary)]" />
                    <span>
                      Powered by <span className="font-semibold text-[color:var(--brand-primary)]">AccezzPay</span>
                    </span>
                  </div>
                  
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

