import type { ReactNode } from "react"
import Link from "next/link"
import { FiArrowDownCircle, FiArrowUpCircle, FiPercent, FiCreditCard } from "react-icons/fi"

import { requireAuthenticatedUser } from "@/lib/auth"
import { getLedgerSummaryForOrganizer, listLedgerEntriesForOrganizer } from "@/lib/data/ledger"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { requestWithdrawalAction } from "./actions"

export default async function WalletPage() {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id

  if (!organizerId) {
    return (
      <div className="space-y-6">
        <Card className="mx-auto max-w-xl rounded-3xl border-0 bg-white/90 p-8 text-center shadow-lg shadow-slate-200/40 ring-1 ring-slate-100">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-semibold text-slate-900">No organizer detected</CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Link your profile to an organizer account before viewing wallet information.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/dashboard/settings">
              <Button className="rounded-full bg-[var(--brand-primary)] px-6 text-white hover:bg-[var(--brand-primary)]/90">
                Review organizer settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [summary, ledgerEntries] = await Promise.all([
    getLedgerSummaryForOrganizer(organizerId),
    listLedgerEntriesForOrganizer(organizerId),
  ])

  const availableBalance = summary.pendingCents
  const currency = summary.currency ?? "NGN"

  type WalletStat = {
    label: string
    value: string
    helper: string
    accent: {
      gradient: string
      iconBg: string
    }
    icon: ReactNode
    badge?: string
    badgeClassName?: string
  }

  const stats: WalletStat[] = [
    {
      label: "Available Balance",
      value: formatCurrencyFromCents(availableBalance, currency),
      helper: "Funds ready to request",
      accent: {
        gradient: "from-[#F7E9FF] via-white to-[#E9DBFF]",
        iconBg: "bg-[#6B21A8]/10 text-[#6B21A8]",
      },
      icon: <FiArrowDownCircle className="h-6 w-6" />,
      badge: availableBalance > 0 ? "Eligible for payout" : "Awaiting new orders",
      badgeClassName:
        availableBalance > 0
          ? "bg-[#F1ECFF] text-[#6B21A8] border-transparent"
          : "bg-slate-100 text-slate-500 border-transparent",
    },
    {
      label: "Total Withdrawn",
      value: formatCurrencyFromCents(summary.withdrawnCents, currency),
      helper: "Payouts already completed",
      accent: {
        gradient: "from-[#E3F5FF] via-white to-[#D6E9FF]",
        iconBg: "bg-[#0F82D8]/10 text-[#0F82D8]",
      },
      icon: <FiArrowUpCircle className="h-6 w-6" />,
    },
    {
      label: "Platform Fees",
      value: formatCurrencyFromCents(summary.totalPlatformFees, currency),
      helper: "Accumulated AccezzPay fees",
      accent: {
        gradient: "from-[#FFF4E8] via-white to-[#FFE6C7]",
        iconBg: "bg-[#F97316]/10 text-[#F97316]",
      },
      icon: <FiPercent className="h-6 w-6" />,
    },
    {
      label: "Gateway Fees",
      value: formatCurrencyFromCents(summary.totalGatewayFees, currency),
      helper: "Processing and network costs",
      accent: {
        gradient: "from-[#E8FFF4] via-white to-[#CFFADF]",
        iconBg: "bg-[#22C55E]/10 text-[#16A34A]",
      },
      icon: <FiCreditCard className="h-6 w-6" />,
    },
  ]

  const statusStyles: Record<
    string,
    {
      label: string
      className: string
    }
  > = {
    pending: { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-600" },
    settled: { label: "Settled", className: "border-emerald-200 bg-emerald-50 text-emerald-600" },
    failed: { label: "Failed", className: "border-rose-200 bg-rose-50 text-rose-600" },
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Wallet</p>
          <h1 className="text-3xl font-bold text-slate-900">Manage payouts & earnings</h1>
          <p className="text-sm text-slate-500">
            Track revenue, fees, and withdrawal requests across your organizer account.
          </p>
        </div>
        <form action={requestWithdrawalAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Badge className="rounded-full border-transparent bg-slate-100 px-3 py-1 text-[0.7rem] font-medium text-slate-600">
            {currency} balance updates as orders reconcile
          </Badge>
          <Button
            type="submit"
            disabled={availableBalance <= 0}
            className="rounded-full bg-[var(--brand-primary)] px-6 text-white shadow-md transition hover:bg-[var(--brand-primary)]/90 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {availableBalance > 0
              ? `Withdraw ${formatCurrencyFromCents(availableBalance, currency)}`
              : "No balance to withdraw"}
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${stat.accent.gradient} p-[1px] transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(15,23,42,0.6)]`}
          >
            <Card className="h-full rounded-[28px] border-0 bg-white/95 px-6 py-5 shadow-none backdrop-blur">
              <div className="flex h-full flex-col justify-between gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
                    <p className="mt-2 text-xs font-medium text-slate-500">{stat.helper}</p>
                  </div>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.accent.iconBg}`}>
                    {stat.icon}
                  </span>
                </div>
                {stat.badge ? (
                  <Badge
                    variant="secondary"
                    className={`rounded-full px-3 py-1 text-[0.7rem] font-medium ${stat.badgeClassName ?? ""}`}
                  >
                    {stat.badge}
                  </Badge>
                ) : null}
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="rounded-3xl border-0 bg-white shadow-none ring-1 ring-slate-100">
          <CardHeader className="flex flex-col gap-1 pb-4">
            <CardTitle className="text-lg text-slate-900">Transaction Ledger</CardTitle>
            <CardDescription className="text-sm text-slate-500">
              All reconciled orders and associated revenue splits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ledgerEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
                No ledger entries yet. Complete a sale to populate this view.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                      <tr className="text-left">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Organizer Share</th>
                        <th className="px-4 py-3 text-right">Platform Fee</th>
                        <th className="px-4 py-3 text-right">Gateway Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry, index) => {
                        const style = statusStyles[entry.status] ?? statusStyles.pending
                        return (
                          <tr
                            key={entry.id}
                            className={`text-slate-600 transition hover:bg-slate-50 ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-slate-700">
                              {formatDate(entry.order.created_at)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="font-mono text-xs text-slate-500">{entry.order.id}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={`rounded-full border ${style.className} px-3 py-1 text-[0.7rem] font-medium capitalize`}
                              >
                                {style.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-700">
                              {formatCurrencyFromCents(Number(entry.organizer_amount_cents), entry.currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {formatCurrencyFromCents(Number(entry.platform_fee_cents), entry.currency)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              {formatCurrencyFromCents(Number(entry.gateway_fee_cents), entry.currency)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 bg-slate-50/60 shadow-none ring-1 ring-slate-100">
          <CardHeader className="flex flex-col gap-1 pb-4">
            <CardTitle className="text-lg text-slate-900">Payout guidance</CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Stay on top of settlement timelines and payout readiness.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Settlement cadence</p>
              <p className="mt-2 text-sm text-slate-600">
                Pending balances are reviewed daily. Funds become eligible for payout once orders are settled.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tax reminders</p>
              <p className="mt-2 text-sm text-slate-600">
                Download reconciled reports each quarter to stay compliant with regional tax requirements.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-center text-xs text-slate-500">
              Connect settlement alerts to Slack or email to get notified when payouts are ready.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

