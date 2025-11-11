"use server"

import { z } from "zod"

import { createCheckoutSessionInternal } from "@/lib/payments/checkout"

const CheckoutFormSchema = z.object({
  organizer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  ticket_type_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  buyer_name: z.string().min(1),
  buyer_email: z.string().email(),
  buyer_phone: z.string().optional().nullable(),
  redirect_url: z.string().url().optional().nullable(),
})

export async function createCheckoutSession(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = CheckoutFormSchema.parse(raw)
  return createCheckoutSessionInternal({
    organizer_id: parsed.organizer_id,
    product_id: parsed.product_id,
    ticket_type_id: parsed.ticket_type_id,
    quantity: parsed.quantity,
    buyer_name: parsed.buyer_name,
    buyer_email: parsed.buyer_email,
    buyer_phone: parsed.buyer_phone ?? undefined,
    redirect_url: parsed.redirect_url ?? undefined,
  })
}

