import { supabaseAdminClient } from "../supabase-admin"
import type { Ticket } from "@/types/database"

export async function findTicketByCode(ticketCode: string): Promise<Ticket | null> {
  const { data, error } = await supabaseAdminClient.from("tickets").select("*").eq("ticket_code", ticketCode).single()
  if (error && error.code !== "PGRST116") {
    console.error("findTicketByCode error", error)
    throw error
  }
  return (data as Ticket) ?? null
}

export async function markTicketAsUsed(ticketId: string): Promise<Ticket> {
  const { data, error } = await supabaseAdminClient
    .from("tickets")
    .update({ status: "used", updated_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*")
    .single()

  if (error) {
    console.error("markTicketAsUsed error", error)
    throw error
  }
  return data as Ticket
}

export async function listTicketsForOrder(orderId: string): Promise<Ticket[]> {
  const { data, error } = await supabaseAdminClient.from("tickets").select("*").eq("order_id", orderId)
  if (error) {
    console.error("listTicketsForOrder error", error)
    throw error
  }
  return (data as Ticket[]) ?? []
}

export async function createTickets(tickets: Array<Omit<Ticket, "created_at" | "updated_at">>): Promise<Ticket[]> {
  const nowIso = new Date().toISOString()
  const payload = tickets.map((ticket) => ({
    ...ticket,
    created_at: nowIso,
    updated_at: nowIso,
  }))
  const { data, error } = await supabaseAdminClient.from("tickets").insert(payload).select("*")
  if (error) {
    console.error("createTickets error", error)
    throw error
  }
  return (data as Ticket[]) ?? []
}

export async function summarizeTicketsByProduct(productId: string): Promise<
  Record<
    string,
    {
      total: number
      used: number
    }
  >
> {
  const { data, error } = await supabaseAdminClient.from("tickets").select("ticket_type_id, status").eq("product_id", productId)
  if (error) {
    console.error("summarizeTicketsByProduct error", error)
    throw error
  }

  const summary: Record<string, { total: number; used: number }> = {}
  for (const ticket of data ?? []) {
    const typeId = ticket.ticket_type_id as string
    if (!summary[typeId]) {
      summary[typeId] = { total: 0, used: 0 }
    }
    summary[typeId].total += 1
    if (ticket.status === "used") {
      summary[typeId].used += 1
    }
  }
  return summary
}

