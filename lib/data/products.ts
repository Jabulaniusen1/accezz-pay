import { supabaseAdminClient } from "../supabase-admin"
import type { Product, ProductWithRelations, TicketType } from "@/types/database"

export type CreateProductInput = {
  organizer_id: string
  title: string
  description?: string | null
  metadata?: Record<string, unknown>
  start_at?: string | null
  end_at?: string | null
  venue?: Record<string, unknown>
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data, error } = await supabaseAdminClient.from("products").insert(input).select("*").single()
  if (error) {
    console.error("createProduct error", error)
    throw error
  }
  return data as Product
}

export async function listProductsByOrganizer(organizerId: string): Promise<Product[]> {
  const { data, error } = await supabaseAdminClient
    .from("products")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("start_at", { ascending: true })

  if (error) {
    console.error("listProductsByOrganizer error", error)
    throw error
  }
  return (data as Product[]) ?? []
}

export async function getProductById(productId: string): Promise<Product | null> {
  const { data, error } = await supabaseAdminClient.from("products").select("*").eq("id", productId).single()
  if (error && error.code !== "PGRST116") {
    console.error("getProductById error", error)
    throw error
  }
  return (data as Product) ?? null
}

export async function getProductWithTicketTypes(productId: string): Promise<ProductWithRelations | null> {
  if (!productId) {
    return null
  }
  const { data, error } = await supabaseAdminClient.from("products").select("*, ticket_types(*)").eq("id", productId).maybeSingle()
  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    console.error("getProductWithTicketTypes error", error)
    throw error
  }
  if (!data) {
    return null
  }
  return data as ProductWithRelations
}

export type UpdateProductInput = Partial<Omit<CreateProductInput, "organizer_id">>

export async function updateProduct(productId: string, updates: UpdateProductInput): Promise<Product> {
  const { data, error } = await supabaseAdminClient
    .from("products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .select("*")
    .single()

  if (error) {
    console.error("updateProduct error", error)
    throw error
  }
  return data as Product
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabaseAdminClient.from("products").delete().eq("id", productId)
  if (error) {
    console.error("deleteProduct error", error)
    throw error
  }
}

export type CreateTicketTypeInput = {
  product_id: string
  name: string
  sku: string
  price_cents: number
  currency: string
  quantity_total: number
  quantity_available: number
  sales_start?: string | null
  sales_end?: string | null
  sales_limit_per_customer?: number | null
}

export async function createTicketType(input: CreateTicketTypeInput): Promise<TicketType> {
  const { data, error } = await supabaseAdminClient.from("ticket_types").insert(input).select("*").single()
  if (error) {
    console.error("createTicketType error", error)
    throw error
  }
  return data as TicketType
}

export async function updateTicketType(ticketTypeId: string, updates: Partial<CreateTicketTypeInput>): Promise<TicketType> {
  const { data, error } = await supabaseAdminClient
    .from("ticket_types")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketTypeId)
    .select("*")
    .single()

  if (error) {
    console.error("updateTicketType error", error)
    throw error
  }
  return data as TicketType
}

export async function deleteTicketType(ticketTypeId: string): Promise<void> {
  const { error } = await supabaseAdminClient.from("ticket_types").delete().eq("id", ticketTypeId)
  if (error) {
    console.error("deleteTicketType error", error)
    throw error
  }
}

export async function adjustTicketInventory(ticketTypeId: string, quantityDelta: number): Promise<TicketType> {
  const { data, error } = await supabaseAdminClient.rpc("adjust_ticket_inventory", {
    p_ticket_type_id: ticketTypeId,
    p_quantity_delta: quantityDelta,
  })

  if (error) {
    console.error("adjustTicketInventory error", error)
    throw error
  }
  return data as TicketType
}

