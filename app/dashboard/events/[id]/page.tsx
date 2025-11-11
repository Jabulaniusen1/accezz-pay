import Link from "next/link"
import { notFound } from "next/navigation"
import { FiEdit, FiLink, FiCode, FiEye, FiTrendingUp, FiUsers, FiCheckCircle } from "react-icons/fi"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CopyLinkField } from "@/components/dashboard/copy-link-field"
import { requireAuthenticatedUser } from "@/lib/auth"
import { getProductWithTicketTypes } from "@/lib/data/products"
import { getOrganizerById } from "@/lib/data/organizers"
import { summarizeTicketsByProduct } from "@/lib/data/tickets"
import { listOrdersForProduct } from "@/lib/data/orders"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"
import { DEFAULT_BRAND_COLOR } from "@/lib/constants"
import { CheckoutClient } from "@/components/checkout/checkout-client"

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

type EventDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params
  const authUser = await requireAuthenticatedUser()
  const product = await getProductWithTicketTypes(id)

  if (!product) {
    notFound()
  }

  if (authUser.profile.role !== "superadmin" && authUser.profile.organizer_id !== product.organizer_id) {
    notFound()
  }

  const organizer = await getOrganizerById(product.organizer_id)
  if (!organizer) {
    notFound()
  }
  const orders = await listOrdersForProduct(product.id)
  const ticketSummary = await summarizeTicketsByProduct(product.id)

  const currency = (product.metadata?.currency as string) || "NGN"
  const totalRevenueCents = orders.filter((order) => order.status === "paid").reduce((sum, order) => sum + Number(order.total_cents), 0)
  const totalTicketsSold = Object.values(ticketSummary).reduce((sum, entry) => sum + entry.total, 0)
  const ticketsUsed = Object.values(ticketSummary).reduce((sum, entry) => sum + entry.used, 0)

  const organizerSlug = organizer.slug ?? product.organizer_id
  const checkoutUrl = `${appUrl}/checkout?client_id=${organizerSlug}&product_id=${product.id}`
  const brandedCheckoutUrl = `${appUrl}/o/${organizer.slug}/checkout/${product.id}`

  const brandColor = (product.metadata?.primaryColor as string) ?? DEFAULT_BRAND_COLOR

  const recentPurchases = orders.slice(0, 10)
  const ticketTypes = product.ticket_types ?? []

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">{product.title}</h1>
          <p className="text-foreground/70">
            {product.start_at ? `${formatDate(product.start_at)}` : "Flexible schedule"}
            {product.venue?.name ? ` • ${product.venue.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/events/${product.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <FiEdit className="h-4 w-4" />
              Edit Event
            </Button>
          </Link>
          <Link href={checkoutUrl} target="_blank" rel="noreferrer">
            <Button className="gap-2" style={{ backgroundColor: brandColor, color: "#fff" }}>
              <FiEye className="h-4 w-4" />
              View Checkout
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrencyFromCents(totalRevenueCents, currency), icon: <FiTrendingUp className="h-6 w-6 text-primary" /> },
          { label: "Tickets Issued", value: totalTicketsSold.toString(), icon: <FiUsers className="h-6 w-6 text-primary" /> },
          { label: "Tickets Checked-in", value: ticketsUsed.toString(), icon: <FiCheckCircle className="h-6 w-6 text-primary" /> },
          { label: "Orders", value: orders.length.toString(), icon: <FiLink className="h-6 w-6 text-primary" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground/70 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiLink className="h-5 w-5 text-primary" />
            Checkout Links
          </CardTitle>
          <CardDescription>Share these URLs with customers or embed via the SDK.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[{ label: "Universal Checkout", url: checkoutUrl }, { label: "Branded Checkout", url: brandedCheckoutUrl }].map((link) => (
            <CopyLinkField key={link.label} label={link.label} value={link.url} />
          ))}
          <p className="text-sm text-foreground/70">
            Customize theme via organizer branding settings. Embed using the SDK: <code className="bg-muted px-2 py-1 rounded">AccezzPay.open()</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiCode className="h-5 w-5 text-primary" />
            Embed Snippet
          </CardTitle>
          <CardDescription>Drop this into your website to launch AccezzPay checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="rounded-lg border border-border bg-muted p-4 text-xs leading-relaxed text-foreground overflow-x-auto">
{`<script src="${appUrl}/sdk/accezzpay.js"></script>
<script>
  AccezzPay.init({
    publicKey: "${process.env.PAYSTACK_PUBLIC_KEY ?? "pk_live_xxx"}",
    organizerId: "${organizerSlug}",
    productId: "${product.id}"
  });
  AccezzPay.open();
</script>`}
          </pre>
          <p className="text-xs text-foreground/60">Replace the public key above with your production Paystack key.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiEye className="h-5 w-5 text-primary" />
            Live Checkout Preview
          </CardTitle>
          <CardDescription>Review the white-labeled checkout form directly within the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-card">
            <CheckoutClient organizer={organizer} product={product} ticketTypes={ticketTypes} preview redirectUrl={null} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Types</CardTitle>
          <CardDescription>Inventory and performance per ticket type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticketTypes.map((ticket) => {
            const summary = ticketSummary[ticket.id] ?? { total: 0, used: 0 }
            return (
              <div key={ticket.id} className="flex justify-between items-center p-4 rounded-lg border border-border bg-card">
                <div>
                  <p className="font-semibold text-foreground">{ticket.name}</p>
                  <p className="text-sm text-foreground/70">SKU: {ticket.sku}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-foreground/70">Issued</p>
                  <p className="font-semibold text-foreground">
                    {summary.total} / {ticket.quantity_total}
                  </p>
                  <p className="text-sm text-foreground/70">Checked-in</p>
                  <p className="font-semibold text-foreground">{summary.used}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-foreground/70">Price</p>
                  <p className="text-lg font-semibold text-[color:var(--brand-primary,#6B21A8)]">
                    {formatCurrencyFromCents(ticket.price_cents, ticket.currency)}
                  </p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
          <CardDescription>Latest orders for this product.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentPurchases.length === 0 && <p className="text-sm text-foreground/70">No orders yet.</p>}
          {recentPurchases.map((order) => (
            <div key={order.id} className="flex justify-between items-center p-3 border border-border rounded-lg bg-card text-sm">
                <div>
                <p className="font-medium text-foreground">{order.buyer_email ?? "Unknown"}</p>
                <p className="text-foreground/70">{formatDate(order.created_at)}</p>
                </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatCurrencyFromCents(Number(order.total_cents), order.currency)}
                </p>
                <p className="text-xs uppercase tracking-wide text-foreground/60">{order.status}</p>
              </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
