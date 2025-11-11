import { NextResponse } from "next/server"
import { z } from "zod"

import { createCheckoutSessionInternal } from "@/lib/payments/checkout"

const InitializeBodySchema = z.object({
  organizer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  ticket_type_id: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
  buyer_name: z.string().min(1),
  buyer_email: z.string().email(),
  buyer_phone: z.string().optional(),
  redirect_url: z.string().url().optional(),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const payload = InitializeBodySchema.parse(json)
    const session = await createCheckoutSessionInternal(payload)
    return NextResponse.json(session)
  } catch (error) {
    console.error("Initialize payment error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to initialize payment" }, { status: 400 })
  }
}

