import { supabaseAdminClient } from "../supabase-admin"
import type { Organizer, OrganizerWithRelations } from "@/types/database"

export async function getOrganizerById(id: string): Promise<Organizer | null> {
  const { data, error } = await supabaseAdminClient.from("organizers").select("*").eq("id", id).single()
  if (error) {
    console.error("getOrganizerById error", error)
    throw error
  }
  if (!data) return null
  return {
    ...(data as Organizer),
    branding: ((data as Organizer).branding ?? {}) as Organizer["branding"],
  }
}

export async function getOrganizerBySlug(slug: string): Promise<Organizer | null> {
  const { data, error } = await supabaseAdminClient.from("organizers").select("*").eq("slug", slug).single()
  if (error && error.code !== "PGRST116") {
    console.error("getOrganizerBySlug error", error)
    throw error
  }
  if (!data) return null
  return {
    ...(data as Organizer),
    branding: ((data as Organizer).branding ?? {}) as Organizer["branding"],
  }
}

export async function listOrganizers(): Promise<Organizer[]> {
  const { data, error } = await supabaseAdminClient.from("organizers").select("*").order("created_at", { ascending: false })
  if (error) {
    console.error("listOrganizers error", error)
    throw error
  }
  return ((data as Organizer[]) ?? []).map((organizer) => ({
    ...organizer,
    branding: (organizer.branding ?? {}) as Organizer["branding"],
  }))
}

type CreateOrganizerInput = {
  name: string
  slug: string
  email: string
  branding?: Record<string, unknown>
  business_reg_number?: string
  tax_id?: string
  contact_person?: string
  phone?: string
  country?: string
  paystack_subaccount_code?: string | null
  paystack_split_code?: string | null
  paystack_percentage_charge?: number | null
}

export async function createOrganizer(input: CreateOrganizerInput): Promise<Organizer> {
  const payload = {
    ...input,
    branding: input.branding ?? {},
  }
  const { data, error } = await supabaseAdminClient.from("organizers").insert(payload).select("*").single()
  if (error) {
    console.error("createOrganizer error", error)
    throw error
  }
  return {
    ...(data as Organizer),
    branding: ((data as Organizer).branding ?? {}) as Organizer["branding"],
  }
}

type UpdateOrganizerBrandingInput = {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  logoUrl?: string
}

export async function updateOrganizerBranding(organizerId: string, branding: UpdateOrganizerBrandingInput): Promise<Organizer> {
  const { data, error } = await supabaseAdminClient
    .from("organizers")
    .update({
      branding,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizerId)
    .select("*")
    .single()

  if (error) {
    console.error("updateOrganizerBranding error", error)
    throw error
  }
  return {
    ...(data as Organizer),
    branding: ((data as Organizer).branding ?? {}) as Organizer["branding"],
  }
}

type UpdateOrganizerSettingsInput = {
  payout_schedule?: string
  bank_details?: Record<string, unknown>
  webhook_url?: string | null
  contact_person?: string | null
  phone?: string | null
  country?: string | null
}

export async function updateOrganizerSettings(organizerId: string, updates: UpdateOrganizerSettingsInput): Promise<Organizer> {
  const { data, error } = await supabaseAdminClient
    .from("organizers")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizerId)
    .select("*")
    .single()

  if (error) {
    console.error("updateOrganizerSettings error", error)
    throw error
  }
  return {
    ...(data as Organizer),
    branding: ((data as Organizer).branding ?? {}) as Organizer["branding"],
  }
}

export async function updateOrganizerPaystackDetails(
  organizerId: string,
  details: Partial<Pick<Organizer, "paystack_subaccount_code" | "paystack_split_code" | "paystack_percentage_charge">>,
): Promise<Organizer> {
  const { data, error } = await supabaseAdminClient
    .from("organizers")
    .update({
      ...details,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizerId)
    .select("*")
    .single()

  if (error) {
    console.error("updateOrganizerPaystackDetails error", error)
    throw error
  }

  return {
    ...(data as Organizer),
    branding: ((data as Organizer).branding ?? {}) as Organizer["branding"],
  }
}

export type OrganizerDashboardSummary = {
  organizer: Organizer
  pendingOrders: number
  paidOrders: number
  totalRevenueCents: number
  ticketsSold: number
}

export async function getOrganizerDashboardSummary(organizerId: string): Promise<OrganizerDashboardSummary> {
  const organizer = await getOrganizerById(organizerId)
  if (!organizer) {
    throw new Error("Organizer not found")
  }

  const [pendingRes, paidRes, revenueRes, ticketsRes] = await Promise.all([
    supabaseAdminClient.from("orders").select("id", { count: "exact", head: true }).eq("organizer_id", organizerId).eq("status", "pending"),
    supabaseAdminClient.from("orders").select("id", { count: "exact", head: true }).eq("organizer_id", organizerId).eq("status", "paid"),
    supabaseAdminClient.from("orders").select("total_cents").eq("organizer_id", organizerId).eq("status", "paid"),
    supabaseAdminClient
      .from("tickets")
      .select("id, orders!inner(organizer_id)", { count: "exact", head: true })
      .eq("orders.organizer_id", organizerId),
  ])

  ;[pendingRes, paidRes, revenueRes, ticketsRes].forEach((res) => {
    if (res.error) {
      console.error("getOrganizerDashboardSummary aggregate error", res.error)
      throw res.error
    }
  })

  const totalRevenueCents = Array.isArray(revenueRes.data) ? revenueRes.data.reduce((sum, row) => sum + Number(row.total_cents), 0) : 0

  return {
    organizer,
    pendingOrders: pendingRes.count ?? 0,
    paidOrders: paidRes.count ?? 0,
    totalRevenueCents,
    ticketsSold: ticketsRes.count ?? 0,
  }
}

export async function getOrganizerWithProducts(organizerId: string): Promise<OrganizerWithRelations | null> {
  const { data, error } = await supabaseAdminClient
    .from("organizers")
    .select("*, products(*)")
    .eq("id", organizerId)
    .order("created_at", { referencedTable: "products", ascending: false })
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("getOrganizerWithProducts error", error)
    throw error
  }

  if (!data) return null
  return {
    ...(data as OrganizerWithRelations),
    branding: ((data as OrganizerWithRelations).branding ?? {}) as Organizer["branding"],
  }
}

