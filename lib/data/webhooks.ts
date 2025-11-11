import { supabaseAdminClient } from "../supabase-admin"
import type { WebhookEvent } from "@/types/database"

export async function recordWebhookEvent(gateway: string, eventType: string, payload: Record<string, unknown>, signature?: string): Promise<WebhookEvent> {
  const { data, error } = await supabaseAdminClient
    .from("webhooks")
    .insert({
      gateway,
      event_type: eventType,
      payload,
      signature: signature ?? null,
    })
    .select("*")
    .single()

  if (error) {
    console.error("recordWebhookEvent error", error)
    throw error
  }
  return data as WebhookEvent
}

export async function markWebhookProcessed(id: number): Promise<void> {
  const { error } = await supabaseAdminClient
    .from("webhooks")
    .update({
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) {
    console.error("markWebhookProcessed error", error)
    throw error
  }
}

