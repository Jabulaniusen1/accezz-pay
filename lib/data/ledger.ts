import { supabaseAdminClient } from "../supabase-admin"
import type { LedgerEntry } from "@/types/database"

export type LedgerEntryWithOrder = LedgerEntry & {
  order: {
    id: string
    currency: string
    created_at: string
    status: string
  }
}

export async function listLedgerEntriesForOrganizer(organizerId: string): Promise<LedgerEntryWithOrder[]> {
  const { data, error } = await supabaseAdminClient
    .from("transactions_ledger")
    .select("*, orders!inner(id, organizer_id, currency, created_at, status)")
    .eq("orders.organizer_id", organizerId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listLedgerEntriesForOrganizer error", error)
    throw error
  }

  return (
    (data as any[])?.map((entry) => ({
      id: entry.id,
      order_id: entry.order_id,
      platform_fee_cents: entry.platform_fee_cents,
      organizer_amount_cents: entry.organizer_amount_cents,
      gateway_fee_cents: entry.gateway_fee_cents,
      net_amount_cents: entry.net_amount_cents,
      currency: entry.currency,
      status: entry.status,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      order: {
        id: entry.orders.id,
        currency: entry.orders.currency,
        created_at: entry.orders.created_at,
        status: entry.orders.status,
      },
    })) ?? []
  )
}

export async function getLedgerSummaryForOrganizer(organizerId: string) {
  const entries = await listLedgerEntriesForOrganizer(organizerId)

  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.status === "pending") {
        acc.pendingCents += Number(entry.organizer_amount_cents)
      }
      if (entry.status === "settled") {
        acc.withdrawnCents += Number(entry.organizer_amount_cents)
      }
      acc.totalPlatformFees += Number(entry.platform_fee_cents)
      acc.totalGatewayFees += Number(entry.gateway_fee_cents)
      acc.currency = entry.currency ?? acc.currency
      return acc
    },
    {
      pendingCents: 0,
      withdrawnCents: 0,
      totalPlatformFees: 0,
      totalGatewayFees: 0,
      currency: "NGN",
    },
  )

  return {
    pendingCents: totals.pendingCents,
    withdrawnCents: totals.withdrawnCents,
    totalPlatformFees: totals.totalPlatformFees,
    totalGatewayFees: totals.totalGatewayFees,
    currency: totals.currency,
  }
}

