import { z } from "zod"

export const organizerSlugSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers and hyphens only")

export const organizerBrandingSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  logoUrl: z.string().url().optional(),
})

export const organizerSettingsSchema = z.object({
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  webhook_url: z.string().url().nullable().optional(),
  payout_schedule: z.enum(["daily", "weekly", "manual"]).optional(),
  bank_details: z
    .object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      accountName: z.string().optional(),
      bankCode: z.string().optional(),
    })
    .passthrough()
    .optional(),
})

export const productSchema = z.object({
  organizer_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  start_at: z.string().datetime().nullable().optional(),
  end_at: z.string().datetime().nullable().optional(),
  venue: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
    })
    .passthrough()
    .optional(),
})

export const ticketTypeSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(2),
  sku: z.string().min(2),
  price_cents: z.number().int().positive(),
  currency: z.string().min(2),
  quantity_total: z.number().int().nonnegative(),
  quantity_available: z.number().int().nonnegative(),
  sales_start: z.string().datetime().nullable().optional(),
  sales_end: z.string().datetime().nullable().optional(),
  sales_limit_per_customer: z.number().int().positive().nullable().optional(),
})

export const createOrderSchema = z.object({
  organizer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  total_cents: z.number().int().positive(),
  currency: z.string().min(2),
  buyer_name: z.string().min(1),
  buyer_email: z.string().email(),
  buyer_phone: z.string().optional().nullable(),
  redirect_url: z.string().url().optional(),
  tickets: z
    .array(
      z.object({
        ticket_type_id: z.string().uuid(),
        quantity: z.number().int().positive().max(10),
        attendee_info: z
          .array(
            z.object({
              name: z.string().min(1),
              email: z.string().email(),
              phone: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .nonempty(),
})

export const paystackWebhookSchema = z.object({
  event: z.string(),
  data: z.record(z.any()),
})

export const paystackCheckoutSchema = z.object({
  ticket_type_id: z.string().uuid(),
  quantity: z.number().int().positive().max(10),
  buyer_email: z.string().email(),
  buyer_name: z.string().min(1),
  buyer_phone: z.string().optional().nullable(),
  redirect_url: z.string().url().optional().nullable(),
})

