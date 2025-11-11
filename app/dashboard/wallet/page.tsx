import Link from "next/link"

import { requireAuthenticatedUser } from "@/lib/auth"
import { getLedgerSummaryForOrganizer, listLedgerEntriesForOrganizer } from "@/lib/data/ledger"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { requestWithdrawalAction } from "./actions"

export default async function WalletPage() {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id

  if (!organizerId) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No organizer detected</CardTitle>
            <CardDescription>Link your profile to an organizer account before viewing wallet information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings">
              <Button>Review organizer settings</Button>
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

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Wallet</h1>
          <p className="text-foreground/70">Track revenue, fees, and withdrawal requests.</p>
        </div>
        <form action={requestWithdrawalAction}>
          <Button type="submit" disabled={availableBalance <= 0}>
            {availableBalance > 0
              ? `Withdraw ${formatCurrencyFromCents(availableBalance, currency)}`
              : "No balance to withdraw"}
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Available Balance</CardTitle>
            <CardDescription>Funds ready to request</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">
            {formatCurrencyFromCents(availableBalance, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Withdrawn</CardTitle>
            <CardDescription>Payouts already requested</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">
            {formatCurrencyFromCents(summary.withdrawnCents, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform Fees</CardTitle>
            <CardDescription>Accumulated AccezzPay fees</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">
            {formatCurrencyFromCents(summary.totalPlatformFees, currency)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Ledger</CardTitle>
          <CardDescription>All reconciled orders and associated splits.</CardDescription>
        </CardHeader>
        <CardContent>
          {ledgerEntries.length === 0 ? (
            <p className="text-sm text-foreground/70">No ledger entries yet. Complete a sale to populate this view.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Organizer Share</th>
                    <th className="py-2 pr-4 text-right">Platform Fee</th>
                    <th className="py-2 pr-4 text-right">Gateway Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4">{formatDate(entry.order.created_at)}</td>
                      <td className="py-2 pr-4">{entry.order.id}</td>
                      <td className="py-2 pr-4 capitalize text-foreground/80">{entry.status}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrencyFromCents(Number(entry.organizer_amount_cents), entry.currency)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrencyFromCents(Number(entry.platform_fee_cents), entry.currency)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrencyFromCents(Number(entry.gateway_fee_cents), entry.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

