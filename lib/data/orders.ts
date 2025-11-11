import { supabaseAdminClient } from "../supabase-admin"
import type { LedgerEntry, Order, OrderWithRelations, Payment, Ticket } from "@/types/database"

export type CreateOrderInput = {
  organizer_id: string
  product_id: string
  total_cents: number
  currency: string
  buyer_name: string
  buyer_email: string
  buyer_phone?: string | null
  paystack_reference?: string | null
  redirect_url?: string | null
  status?: Order["status"]
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data, error } = await supabaseAdminClient.from("orders").insert(input).select("*").single()
  if (error) {
    console.error("createOrder error", error)
    throw error
  }
  return data as Order
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabaseAdminClient.from("orders").select("*").eq("id", orderId).single()
  if (error && error.code !== "PGRST116") {
    console.error("getOrderById error", error)
    throw error
  }
  return (data as Order) ?? null
}

export async function getOrderByReference(reference: string): Promise<Order | null> {
  const { data, error } = await supabaseAdminClient.from("orders").select("*").eq("paystack_reference", reference).single()
  if (error && error.code !== "PGRST116") {
    console.error("getOrderByReference error", error)
    throw error
  }
  return (data as Order) ?? null
}

export async function listOrdersForOrganizer(organizerId: string): Promise<Order[]> {
  const { data, error } = await supabaseAdminClient
    .from("orders")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listOrdersForOrganizer error", error)
    throw error
  }
  return (data as Order[]) ?? []
}

export async function listOrdersForProduct(productId: string): Promise<Order[]> {
  const { data, error } = await supabaseAdminClient
    .from("orders")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listOrdersForProduct error", error)
    throw error
  }

  return (data as Order[]) ?? []
}

export async function getOrderWithRelations(orderId: string): Promise<OrderWithRelations | null> {
  const { data, error } = await supabaseAdminClient
    .from("orders")
    .select("*, tickets(*), payments(*), transactions_ledger(*)")
    .eq("id", orderId)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("getOrderWithRelations error", error)
    throw error
  }
  const result = data as any
  if (!result) return null
  const { transactions_ledger, ...rest } = result
  return {
    ...rest,
    ledger: transactions_ledger as LedgerEntry[],
  } as OrderWithRelations
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<Order> {
  const { data, error } = await supabaseAdminClient
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single()

  if (error) {
    console.error("updateOrderStatus error", error)
    throw error
  }
  return data as Order
}

export async function createPaymentRecord(input: {
  order_id: string
  gateway: string
  gateway_reference?: string | null
  amount_cents: number
  currency: string
  status?: Payment["status"]
  raw_response?: Record<string, unknown> | null
}): Promise<Payment> {
  const { data, error } = await supabaseAdminClient.from("payments").insert(input).select("*").single()
  if (error) {
    console.error("createPaymentRecord error", error)
    throw error
  }
  return data as Payment
}

export async function updatePaymentStatus(paymentId: string, status: Payment["status"], rawResponse?: Record<string, unknown>): Promise<Payment> {
  const { data, error } = await supabaseAdminClient
    .from("payments")
    .update({
      status,
      raw_response: rawResponse ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .select("*")
    .single()

  if (error) {
    console.error("updatePaymentStatus error", error)
    throw error
  }
  return data as Payment
}

export async function updatePaymentStatusByReference(reference: string, status: Payment["status"], rawResponse?: Record<string, unknown>): Promise<Payment> {
  const { data, error } = await supabaseAdminClient
    .from("payments")
    .update({
      status,
      raw_response: rawResponse ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("gateway_reference", reference)
    .select("*")
    .single()

  if (error) {
    console.error("updatePaymentStatusByReference error", error)
    throw error
  }

  return data as Payment
}

export async function updateOrderPaystackReference(orderId: string, reference: string): Promise<Order> {
  const { data, error } = await supabaseAdminClient
    .from("orders")
    .update({
      paystack_reference: reference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("*")
    .single()

  if (error) {
    console.error("updateOrderPaystackReference error", error)
    throw error
  }
  return data as Order
}

export async function createTickets(tickets: Array<Omit<Ticket, "created_at" | "updated_at">>): Promise<Ticket[]> {
  const nowIso = new Date().toISOString()
  const payload = tickets.map((ticket) => ({
    ...ticket,
    created_at: ticket.created_at ?? nowIso,
    updated_at: ticket.updated_at ?? nowIso,
  }))
  const { data, error } = await supabaseAdminClient.from("tickets").insert(payload).select("*")
  if (error) {
    console.error("createTickets error", error)
    throw error
  }
  return (data as Ticket[]) ?? []
}

export async function createLedgerEntry(entry: Omit<LedgerEntry, "id" | "created_at" | "updated_at">): Promise<LedgerEntry> {
  const { data, error } = await supabaseAdminClient.from("transactions_ledger").insert(entry).select("*").single()
  if (error) {
    console.error("createLedgerEntry error", error)
    throw error
  }
  return data as LedgerEntry
}

export async function logAuditEvent(userId: string | null, action: string, details: Record<string, unknown> = {}): Promise<void> {
  const { error } = await supabaseAdminClient.from("audit_logs").insert({
    user_id: userId,
    action,
    details,
  })
  if (error) {
    console.error("logAuditEvent error", error)
    throw error
  }
}

