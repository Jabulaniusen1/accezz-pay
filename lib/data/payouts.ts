import { supabaseAdminClient } from "../supabase-admin"
import type { Payout } from "@/types/database"

export async function schedulePayout(input: {
  organizer_id: string
  amount_cents: number
  currency: string
  scheduled_at?: string | null
  metadata?: Record<string, unknown>
}): Promise<Payout> {
  const { data, error } = await supabaseAdminClient
    .from("payouts")
    .insert({
      ...input,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single()

  if (error) {
    console.error("schedulePayout error", error)
    throw error
  }
  return data as Payout
}

export async function updatePayoutStatus(payoutId: string, status: Payout["status"], metadata?: Record<string, unknown>): Promise<Payout> {
  const { data, error } = await supabaseAdminClient
    .from("payouts")
    .update({
      status,
      metadata: metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", payoutId)
    .select("*")
    .single()

  if (error) {
    console.error("updatePayoutStatus error", error)
    throw error
  }
  return data as Payout
}

export async function listPayouts(organizerId?: string): Promise<Payout[]> {
  const query = supabaseAdminClient.from("payouts").select("*").order("created_at", { ascending: false })
  if (organizerId) {
    query.eq("organizer_id", organizerId)
  }
  const { data, error } = await query
  if (error) {
    console.error("listPayouts error", error)
    throw error
  }
  return (data as Payout[]) ?? []
}

