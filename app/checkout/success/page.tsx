import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ReceiptAutoDownloader } from "@/components/checkout/receipt-auto-downloader"
import { getOrderByReference } from "@/lib/data/orders"
import { getProductWithTicketTypes } from "@/lib/data/products"
import { getOrganizerById } from "@/lib/data/organizers"
import { listTicketsForOrder } from "@/lib/data/tickets"
import { cn, formatCurrencyFromCents } from "@/lib/utils"

type SuccessPageProps = {
  searchParams: Promise<{
    reference?: string
    order_id?: string
    mock?: string
  }>
}

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
})

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})

const venueKeys = ["name", "address", "city", "state", "country"]

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const reference = params.reference ?? null
  const isMock = params.mock === "1"

  let order = null
  let organizer = null
  let product = null
  let tickets: Awaited<ReturnType<typeof listTicketsForOrder>> = []

  if (reference) {
    order = await getOrderByReference(reference)
    if (order) {
      const [organizerResult, productResult, ticketsResult] = await Promise.all([
        getOrganizerById(order.organizer_id),
        getProductWithTicketTypes(order.product_id),
        listTicketsForOrder(order.id),
      ])
      organizer = organizerResult
      product = productResult
      tickets = ticketsResult
    }
  }

  const ticket = tickets[0] ?? null
  const ticketType = ticket && product?.ticket_types ? product.ticket_types.find((type) => type.id === ticket.ticket_type_id) : null

  const quantity = tickets.length
  const ticketLabel =
    quantity > 0 && ticketType
      ? `${quantity} ${ticketType.name}${quantity > 1 ? "s" : ""}`
      : quantity > 0
        ? `${quantity} Ticket${quantity > 1 ? "s" : ""}`
        : "Ticket"

  const eventImage =
    (product?.metadata?.heroImage as string | undefined) ??
    (organizer?.branding?.heroImage as string | undefined) ??
    (organizer?.branding?.logoUrl as string | undefined) ??
    "/placeholder.jpg"

  const logoImage = (organizer?.branding?.logoUrl as string | undefined) ?? "/placeholder-logo.png"

  const eventDate =
    product?.start_at != null
      ? `${shortDateFormatter.format(new Date(product.start_at))}${
          product.start_at ? ` • ${timeFormatter.format(new Date(product.start_at))}` : ""
        }${
          product?.end_at
            ? ` - ${timeFormatter.format(new Date(product.end_at))}`
            : ""
        }`
      : "Flexible schedule"

  const venueParts =
    product?.venue != null
      ? venueKeys.map((key) => {
          const value = product?.venue?.[key as keyof typeof product.venue]
          return typeof value === "string" && value.length > 0 ? value : null
        })
      : []

  const venue = venueParts?.filter(Boolean).join(", ") || product?.venue?.name || "Venue info coming soon"

  const buyerName = order?.buyer_name ?? ticket?.attendee_name ?? "Guest"

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/80 to-secondary/60 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="text-center">
          <h1 className="text-lg font-semibold tracking-wide text-foreground/80">Tickets</h1>
        </header>

        {!reference && (
          <div className="rounded-3xl bg-white/70 p-6 text-center shadow-lg">
            <p className="text-sm text-foreground/70">
              We couldn’t find a payment reference in the URL. Contact support if you completed a payment but can’t access your ticket.
            </p>
          </div>
        )}

        {reference && (!order || !organizer || !product) && (
          <div className="rounded-3xl bg-white/70 p-6 text-center shadow-lg">
            <p className="text-sm text-foreground/80">We’re still finalizing your payment. Refresh this page in a moment or check your email for updates.</p>
          </div>
        )}

        {reference && order && organizer && product && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-black/5">
              <div className="relative h-48">
                <Image src={eventImage} alt={product.title} fill className="object-cover" priority />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute left-5 right-5 bottom-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md ring-1 ring-black/10">
                    <Image src={logoImage} alt={`${organizer.name} logo`} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/80">Event</p>
                    <h2 className="text-lg font-semibold text-white">{product.title}</h2>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 pb-6 pt-7 text-sm text-foreground/80">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:text-sm">
                  <Info label="Date & Time" value={eventDate} />
                  <Info label="Buyer" value={buyerName} />
                  <Info label="Ticket Type" value={ticketLabel} />
                  <Info label="Tickets Purchased" value={`${quantity}`} />
                  {order && <Info label="Purchase Date" value={shortDateFormatter.format(new Date(order.created_at))} />}
                  {order && (
                    <Info
                      label="Total Paid"
                      value={formatCurrencyFromCents(Number(order.total_cents), order.currency)}
                      className="col-span-2"
                    />
                  )}
                  <Info label="Venue" value={venue} className="col-span-2" />
                </div>

                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/10 bg-foreground/[0.02] px-6 py-5">
                  {ticket?.qr_url ? (
                    <img
                      src={ticket.qr_url}
                      alt="Ticket QR code"
                      className="h-40 w-40 rounded-lg border border-foreground/10 bg-white p-3 shadow-inner"
                    />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-xs text-foreground/60">
                      QR code will appear once your ticket is generated.
                    </div>
                  )}
                  <p className="text-xs text-foreground/60">Present this QR code at the event entrance.</p>
                </div>

                {isMock && (
                  <p className="rounded-2xl bg-muted/50 px-4 py-3 text-xs text-foreground/60">
                    This purchase was completed in mock mode. No live gateway charges were made.
                  </p>
                )}
              </div>
            </div>

            <div className={cn("rounded-3xl bg-white/80 p-4 shadow-lg", "space-y-3 text-center text-sm text-foreground/70")}>
              <p>Your tickets and receipt have been sent to your email. Save them securely—you’ll need the QR code for entry.</p>
              <ReceiptAutoDownloader reference={reference} />
              <a
                href={`/api/orders/${reference}/receipt`}
                className="inline-flex items-center justify-center rounded-full border border-foreground/10 bg-white px-4 py-2 text-xs font-medium text-foreground shadow-sm transition hover:bg-foreground/5"
              >
                Download receipt again
              </a>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full rounded-full">
                  Back to dashboard
                </Button>
              </Link>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full rounded-full">
                  Return home
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type InfoProps = {
  label: string
  value: string
  className?: string
}

function Info({ label, value, className }: InfoProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/40">{label}</span>
      <span className="text-sm font-semibold text-foreground/80">{value}</span>
    </div>
  )
}

