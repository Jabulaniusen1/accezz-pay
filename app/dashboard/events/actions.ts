'use server'

import { redirect } from "next/navigation"
import { z } from "zod"

import { requireAuthenticatedUser } from "@/lib/auth"
import { createProduct, updateProduct, createTicketType, updateTicketType, deleteTicketType } from "@/lib/data/products"
import type { TicketType } from "@/types/database"
import { supabaseAdminClient } from "@/lib/supabase-admin"

const ticketSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  sku: z.string().min(2).optional(),
  price: z.union([z.string(), z.number()]).transform((value) => {
    const num = typeof value === "string" ? Number(value) : value
    return Math.round(num * 100)
  }),
  currency: z.string().length(3).default("NGN"),
  quantity: z.union([z.string(), z.number()]).transform((value) => Number(value)),
  salesStart: z.string().optional().nullable(),
  salesEnd: z.string().optional().nullable(),
  perCustomerLimit: z.union([z.string(), z.number()]).optional().nullable().transform((value) => {
    if (value === undefined || value === null || value === "") return null
    return Number(value)
  }),
})

const recurrenceOptions = ["weekly", "monthly", "semiannual", "annual"] as const

const eventSchema = z.object({
  productId: z.string().uuid().optional(),
  title: z.string().min(3, "Title is required"),
  description: z.string().optional().nullable(),
  startDate: z.string().min(1),
  startTime: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  venueName: z.string().optional().nullable(),
  venueAddress: z.string().optional().nullable(),
  venueCity: z.string().optional().nullable(),
  venueState: z.string().optional().nullable(),
  venueCountry: z.string().optional().nullable(),
  heroImage: z.string().optional().nullable(),
  recurrenceFrequency: z.enum(recurrenceOptions).optional(),
  tickets: z.array(ticketSchema).min(1, "Add at least one ticket type"),
})

function combineDateTime(date: string | null | undefined, time: string | null | undefined) {
  if (!date) return null
  if (!time) {
    return new Date(`${date}T00:00:00Z`).toISOString()
  }
  return new Date(`${date}T${time}:00Z`).toISOString()
}

export type EventFormInput = z.input<typeof eventSchema>

export async function createEventAction(input: EventFormInput) {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id
  if (!organizerId) {
    throw new Error("Organizer not found for user")
  }

  const parsed = eventSchema.parse(input)

  const product = await createProduct({
    organizer_id: organizerId,
    title: parsed.title,
    description: parsed.description,
    metadata: {
      heroImage: parsed.heroImage ?? null,
       recurrenceFrequency: parsed.recurrenceFrequency ?? null,
    },
    start_at: combineDateTime(parsed.startDate, parsed.startTime),
    end_at: combineDateTime(parsed.endDate ?? parsed.startDate, parsed.endTime ?? parsed.startTime),
    venue: {
      name: parsed.venueName,
      address: parsed.venueAddress,
      city: parsed.venueCity,
      state: parsed.venueState,
      country: parsed.venueCountry,
    },
  })

  for (const ticket of parsed.tickets) {
    await createTicketType({
      product_id: product.id,
      name: ticket.name,
      sku: ticket.sku ?? ticket.name.toLowerCase().replace(/\s+/g, "-"),
      price_cents: ticket.price,
      currency: ticket.currency ?? "NGN",
      quantity_total: ticket.quantity,
      quantity_available: ticket.quantity,
      sales_start: ticket.salesStart ? new Date(ticket.salesStart).toISOString() : combineDateTime(parsed.startDate, parsed.startTime),
      sales_end: ticket.salesEnd ? new Date(ticket.salesEnd).toISOString() : combineDateTime(parsed.endDate ?? parsed.startDate, parsed.endTime ?? parsed.startTime),
      sales_limit_per_customer: ticket.perCustomerLimit,
    })
  }

  redirect(`/dashboard/events/${product.id}?status=created`)
}

export async function updateEventAction(input: EventFormInput) {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id
  if (!organizerId) {
    throw new Error("Organizer not found for user")
  }

  const parsed = eventSchema.parse(input)
  if (!parsed.productId) {
    throw new Error("productId is required for updates")
  }

  await updateProduct(parsed.productId, {
    title: parsed.title,
    description: parsed.description,
    metadata: {
      heroImage: parsed.heroImage ?? null,
      recurrenceFrequency: parsed.recurrenceFrequency ?? null,
    },
    start_at: combineDateTime(parsed.startDate, parsed.startTime),
    end_at: combineDateTime(parsed.endDate ?? parsed.startDate, parsed.endTime ?? parsed.startTime),
    venue: {
      name: parsed.venueName,
      address: parsed.venueAddress,
      city: parsed.venueCity,
      state: parsed.venueState,
      country: parsed.venueCountry,
    },
  })

  const { data: existingTicketTypes } = await supabaseAdminClient
    .from("ticket_types")
    .select("id, quantity_total, quantity_available")
    .eq("product_id", parsed.productId)

  const existingRecords = new Map(
    (existingTicketTypes as Array<Pick<TicketType, "id" | "quantity_total" | "quantity_available">> | null)?.map((ticket) => [
      ticket.id,
      ticket,
    ]) ?? [],
  )
  const existingIds = new Set(existingRecords.keys())
  const incomingIds = new Set(parsed.tickets.filter((ticket) => ticket.id).map((ticket) => ticket.id as string))

  // Delete removed ticket types
  for (const existingId of existingIds) {
    if (!incomingIds.has(existingId)) {
      await deleteTicketType(existingId)
    }
  }

  for (const ticket of parsed.tickets) {
    if (ticket.id) {
      const updatePayload: Partial<Parameters<typeof updateTicketType>[1]> = {
        name: ticket.name,
        sku: ticket.sku ?? ticket.name.toLowerCase().replace(/\s+/g, "-"),
        price_cents: ticket.price,
        currency: ticket.currency ?? "NGN",
        quantity_total: ticket.quantity,
        sales_start: ticket.salesStart ? new Date(ticket.salesStart).toISOString() : combineDateTime(parsed.startDate, parsed.startTime),
        sales_end: ticket.salesEnd ? new Date(ticket.salesEnd).toISOString() : combineDateTime(parsed.endDate ?? parsed.startDate, parsed.endTime ?? parsed.startTime),
        sales_limit_per_customer: ticket.perCustomerLimit,
      }

      const existing = existingRecords.get(ticket.id)
      if (existing) {
        const sold = existing.quantity_total - existing.quantity_available
        const recalculatedAvailable = Math.max(ticket.quantity - sold, 0)
        updatePayload.quantity_available = recalculatedAvailable
      }

      await updateTicketType(ticket.id, updatePayload)
    } else {
      await createTicketType({
        product_id: parsed.productId,
        name: ticket.name,
        sku: ticket.sku ?? ticket.name.toLowerCase().replace(/\s+/g, "-"),
        price_cents: ticket.price,
        currency: ticket.currency ?? "NGN",
        quantity_total: ticket.quantity,
        quantity_available: ticket.quantity,
        sales_start: ticket.salesStart ? new Date(ticket.salesStart).toISOString() : combineDateTime(parsed.startDate, parsed.startTime),
        sales_end: ticket.salesEnd ? new Date(ticket.salesEnd).toISOString() : combineDateTime(parsed.endDate ?? parsed.startDate, parsed.endTime ?? parsed.startTime),
        sales_limit_per_customer: ticket.perCustomerLimit,
      })
    }
  }

  redirect(`/dashboard/events/${parsed.productId}?status=updated`)
}

