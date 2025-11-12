import Link from "next/link"
import { FiBox, FiDollarSign, FiCheckCircle, FiExternalLink } from "react-icons/fi"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"
import { requireAuthenticatedUser } from "@/lib/auth"
import { getOrganizerDashboardSummary } from "@/lib/data/organizers"
import { listProductsByOrganizer } from "@/lib/data/products"
import { Ticket } from "lucide-react"
import { CreateEventButton } from "@/components/dashboard/create-event-button"

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
          change: "+5% vs last month",
          accent: {
            gradient: "from-[#FFE7F2] via-white to-[#FFD6EA]",
            iconBg: "bg-[#FF6FAF]/15 text-[#FF4C9A]",
          },
          icon: <FiBox className="h-6 w-6" />,
        },
        {
          label: "Tickets Sold",
          value: summary.ticketsSold.toString(),
          change: "+12% vs last event",
          accent: {
            gradient: "from-[#E3F5FF] via-white to-[#D6E9FF]",
            iconBg: "bg-[#1D9BF0]/15 text-[#0F82D8]",
          },
          icon: <Ticket className="h-6 w-6" />,
        },
        {
          label: "Revenue",
          value: formatCurrencyFromCents(summary.totalRevenueCents, displayCurrency),
          change: "+8.2% week over week",
          accent: {
            gradient: "from-[#E9FCE5] via-white to-[#D5F5C8]",
            iconBg: "bg-[#34C759]/15 text-[#2BA84A]",
          },
          icon: <FiDollarSign className="h-6 w-6" />,
        },
        {
          label: "Paid Orders",
          value: summary.paidOrders.toString(),
          change: "98% fulfillment rate",
          accent: {
            gradient: "from-[#EDEBFF] via-white to-[#D8D4FF]",
            iconBg: "bg-[#6B21A8]/15 text-[#6B21A8]",
          },
          icon: <FiCheckCircle className="h-6 w-6" />,
        },
      ]
    : []

  const bankDetails = summary?.organizer.bank_details as {
    accountNumber?: unknown
    accountName?: unknown
    bankCode?: unknown
  } | null
  const hasAccountDetails = summary
    ? Boolean(
        bankDetails &&
          typeof bankDetails.accountNumber === "string" &&
          bankDetails.accountNumber.trim() &&
          typeof bankDetails.accountName === "string" &&
          bankDetails.accountName.trim() &&
          typeof bankDetails.bankCode === "string" &&
          bankDetails.bankCode.trim(),
      )
    : true

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Overview</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {summary ? `You're managing ${summary.organizer.name}` : "Review and manage organizers"}
          </h1>
          <p className="text-sm text-slate-500">
            Keep an eye on sales, tickets, and product performance in one place.
          </p>
        </div>
        <CreateEventButton
          hasAccountDetails={hasAccountDetails}
          profileHref="/dashboard/settings?tab=profile"
          className="rounded-full bg-[var(--brand-primary)] px-6 text-white shadow-lg hover:bg-[var(--brand-primary)]/90"
        >
          Create Event
        </CreateEventButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${stat.accent.gradient} p-[1px] transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(15,23,42,0.6)]`}
          >
            <Card className="h-full rounded-[28px] border-0 bg-white/90 px-6 py-5 shadow-none backdrop-blur">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="mt-2 text-xs font-medium text-slate-500">{stat.change}</p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.accent.iconBg}`}>
                  {stat.icon}
                </span>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="rounded-3xl border-0 bg-slate-50/60 shadow-none ring-1 ring-slate-100">
          <CardHeader className="flex flex-col gap-1 pb-2">
            <CardTitle className="text-lg text-slate-900">Recent Products</CardTitle>
            <CardDescription className="text-slate-500">Latest items available for checkout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.length === 0 && (
              <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-slate-500 shadow-inner">
                Create your first product to start selling tickets.
              </div>
            )}
            {products.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-transparent bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-primary)]/30 hover:shadow-lg"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{product.title}</p>
                  <p className="text-xs text-slate-500">
                    {product.start_at
                      ? `${formatDate(product.start_at)} · ${formatDate(product.end_at ?? product.start_at)}`
                      : "Flexible date"}
                  </p>
                </div>
                <Link href={`/dashboard/events/${product.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-slate-200 text-xs text-slate-600 transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
                  >
                    <FiExternalLink className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-white shadow-none ring-1 ring-slate-100">
          <CardHeader className="flex flex-col gap-1 pb-2">
            <CardTitle className="text-lg text-slate-900">Performance Snapshot</CardTitle>
            <CardDescription className="text-slate-500">
              Quick view of fulfillment, refunds, and engagement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fulfillment</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary?.paidOrders ?? 0}</p>
              <p className="text-xs text-slate-500">Paid orders processed in the last 30 days.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Refund rate</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">0.7%</p>
                <p className="text-xs text-slate-500">Down 0.3% vs last month.</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Check-in readiness</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">86%</p>
                <p className="text-xs text-slate-500">Tickets with QR codes generated.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
              Connect real-time analytics to enrich these insights with live attendee behaviour.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
