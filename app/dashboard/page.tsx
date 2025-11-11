import Link from "next/link"
import { FiBox, FiDollarSign, FiCheckCircle, FiPlusCircle, FiExternalLink } from "react-icons/fi"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"
import { requireAuthenticatedUser } from "@/lib/auth"
import { getOrganizerDashboardSummary } from "@/lib/data/organizers"
import { listProductsByOrganizer } from "@/lib/data/products"
import { Ticket } from "lucide-react"

export default async function DashboardPage() {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id

  if (!organizerId && authUser.profile.role !== "superadmin") {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No organizer assigned</CardTitle>
            <CardDescription>Contact support to link your account to an organizer profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const targetOrganizerId = organizerId ?? null
  const summary = targetOrganizerId ? await getOrganizerDashboardSummary(targetOrganizerId) : null
  const products = targetOrganizerId ? await listProductsByOrganizer(targetOrganizerId) : []

  const displayCurrency =
    (summary?.organizer.branding as Record<string, unknown> | undefined)?.currency?.toString() ?? "NGN"

  const stats = summary
    ? [
        {
          label: "Total Products",
          value: products.length.toString(),
          icon: <FiBox className="h-6 w-6 text-primary" />,
        },
        {
          label: "Tickets Sold",
          value: summary.ticketsSold.toString(),
          icon: <Ticket className="h-6 w-6 text-primary" />,
        },
        {
          label: "Revenue",
          value: formatCurrencyFromCents(summary.totalRevenueCents, displayCurrency),
          icon: <FiDollarSign className="h-6 w-6 text-primary" />,
        },
        {
          label: "Paid Orders",
          value: summary.paidOrders.toString(),
          icon: <FiCheckCircle className="h-6 w-6 text-primary" />,
        },
      ]
    : []

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-foreground/70">
            {summary ? `Tracking ${summary.organizer.name}` : "Review and manage organizers"}
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="bg-primary hover:bg-accent text-primary-foreground gap-2">
            <FiPlusCircle className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat) => (
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
          <CardTitle>Recent Products</CardTitle>
          <CardDescription>Latest items available for checkout</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.length === 0 && (
              <p className="text-sm text-foreground/70">Create your first product to start selling tickets.</p>
            )}
            {products.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap gap-4 justify-between items-center p-4 rounded-lg border border-border transition-colors hover:border-primary/40"
              >
                <div>
                  <p className="font-semibold text-foreground">{product.title}</p>
                  <p className="text-sm text-foreground/70">
                    {product.start_at ? `${formatDate(product.start_at)} – ${formatDate(product.end_at ?? product.start_at)}` : "Flexible date"}
                  </p>
                </div>
                <div className="text-right">
                  <Link href={`/dashboard/events/${product.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FiExternalLink className="h-4 w-4" />
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
