"use server"

import { supabaseAdminClient } from "@/lib/supabase-admin"
import { requireAuthenticatedUser } from "@/lib/auth"

import { revalidatePath } from "next/cache"

export async function requestWithdrawalAction() {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id
  if (!organizerId) {
    throw new Error("Organizer not linked to user profile")
  }

  const { data: ledgerEntries, error } = await supabaseAdminClient
    .from("transactions_ledger")
    .select("id, organizer_amount_cents, currency, status, orders!inner(organizer_id)")
    .eq("orders.organizer_id", organizerId)
    .eq("status", "pending")

  if (error) {
    console.error("requestWithdrawalAction ledger error", error)
    throw error
  }

  if (!ledgerEntries || ledgerEntries.length === 0) {
    throw new Error("No available balance to withdraw.")
  }

  const currency = ledgerEntries[0].currency ?? "NGN"
  const totalAmount = ledgerEntries.reduce((sum, entry) => sum + Number(entry.organizer_amount_cents ?? 0), 0)

  const { error: payoutError, data: payout } = await supabaseAdminClient
    .from("payouts")
    .insert({
      organizer_id: organizerId,
      amount_cents: totalAmount,
      currency,
      status: "scheduled",
      scheduled_at: new Date().toISOString(),
    })
    .select("*")
    .single()

  if (payoutError) {
    console.error("requestWithdrawalAction payout error", payoutError)
    throw payoutError
  }

  const entryIds = ledgerEntries.map((entry) => entry.id)
  const { error: ledgerUpdateError } = await supabaseAdminClient
    .from("transactions_ledger")
    .update({
      status: "settled",
      updated_at: new Date().toISOString(),
    })
    .in("id", entryIds)

  if (ledgerUpdateError) {
    console.error("requestWithdrawalAction ledger update error", ledgerUpdateError)
    throw ledgerUpdateError
  }

  revalidatePath("/dashboard/wallet")

  return {
    success: true,
    payout,
  }
}

