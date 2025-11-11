import { z } from "zod"

import { createOrder, createPaymentRecord, updateOrderPaystackReference } from "@/lib/data/orders"
import { getProductWithTicketTypes } from "@/lib/data/products"
import { getOrganizerById, updateOrganizerPaystackDetails } from "@/lib/data/organizers"
import { initializePaystackTransaction, ensureOrganizerPaystackDetails } from "@/lib/paystack"
import { paystackCheckoutSchema } from "@/lib/validators"
import { enqueueTicketIssuance } from "@/lib/jobs/ticket-issuer"

const CheckoutInputSchema = paystackCheckoutSchema.extend({
  organizer_id: z.string().uuid(),
  product_id: z.string().uuid(),
})

export type CheckoutSessionInput = z.infer<typeof CheckoutInputSchema>

export type CheckoutSessionResult = {
  authorizationUrl: string
  reference: string
  amount: number
  currency: string
}

export async function createCheckoutSessionInternal(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
  const parsed = CheckoutInputSchema.parse(input)

  const product = await getProductWithTicketTypes(parsed.product_id)
  if (!product || product.organizer_id !== parsed.organizer_id) {
    throw new Error("Product not found for organizer")
  }

  const organizer = await getOrganizerById(parsed.organizer_id)
  if (!organizer) {
    throw new Error("Organizer not found")
  }

  let paystackDetails = await ensureOrganizerPaystackDetails(organizer)
  console.log("[checkout] Paystack details calculated", {
    organizerId: organizer.id,
    subaccount: paystackDetails.subaccountCode,
    splitCode: paystackDetails.splitCode,
    percentageCharge: paystackDetails.percentageCharge,
    isMock: paystackDetails.isMock,
  })

  const ticketType = product.ticket_types?.find((ticket) => ticket.id === parsed.ticket_type_id)
  if (!ticketType) {
    throw new Error("Ticket type not found")
  }

  if (ticketType.quantity_available < parsed.quantity) {
    throw new Error("Requested quantity exceeds availability")
  }

  const totalCents = ticketType.price_cents * parsed.quantity
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const callbackUrl = parsed.redirect_url ?? `${appUrl}/checkout/success`

  const order = await createOrder({
    organizer_id: parsed.organizer_id,
    product_id: parsed.product_id,
    total_cents: totalCents,
    currency: ticketType.currency,
    buyer_name: parsed.buyer_name,
    buyer_email: parsed.buyer_email,
    buyer_phone: parsed.buyer_phone,
    redirect_url: callbackUrl,
    status: "pending",
  })
 
  const hasPaystackSecret = Boolean(process.env.PAYSTACK_SECRET_KEY)

  if (!hasPaystackSecret) {
    const mockReference = `mock_${order.id}`
    await updateOrderPaystackReference(order.id, mockReference)

    const payment = await createPaymentRecord({
      order_id: order.id,
      gateway: "paystack",
      gateway_reference: mockReference,
      amount_cents: totalCents,
      currency: ticketType.currency,
      status: "pending",
      raw_response: {
        status: "mock",
        message: "Paystack secret key not configured. Using mock checkout session.",
      },
    })

    enqueueTicketIssuance({
      orderId: order.id,
      paymentId: payment.id,
      ticketTypeId: ticketType.id,
      quantity: parsed.quantity,
      buyerName: parsed.buyer_name,
      buyerEmail: parsed.buyer_email,
      buyerPhone: parsed.buyer_phone ?? undefined,
      metadata: { mock: true },
    })

    const successUrl = new URL(callbackUrl)
    successUrl.searchParams.set("reference", mockReference)
    successUrl.searchParams.set("order_id", order.id)
    successUrl.searchParams.set("mock", "1")

    return {
      authorizationUrl: successUrl.toString(),
      reference: mockReference,
      amount: totalCents,
      currency: ticketType.currency,
    }
  }

  let initializeResponse

  const attemptInitialize = async () => {
    const metadata: Record<string, unknown> = {
      order_id: order.id,
      organizer_id: order.organizer_id,
      product_id: order.product_id,
      ticket_type_id: ticketType.id,
      quantity: parsed.quantity,
      buyer_name: parsed.buyer_name,
      buyer_phone: parsed.buyer_phone,
      redirect_url: callbackUrl,
    }

    if (paystackDetails.subaccountCode) {
      metadata.subaccount = paystackDetails.subaccountCode
    }
    if (paystackDetails.splitCode) {
      metadata.split_code = paystackDetails.splitCode
    }

    return initializePaystackTransaction({
      email: parsed.buyer_email,
      amount: totalCents,
      reference: `order_${order.id}`,
      currency: ticketType.currency,
      metadata,
      callback_url: callbackUrl,
      subaccount: paystackDetails.subaccountCode ?? undefined,
      split_code: paystackDetails.splitCode ?? undefined,
      bearer: paystackDetails.splitCode ? "account" : undefined,
    })
  }

  try {
    initializeResponse = await attemptInitialize()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isInvalidSplit = /Invalid Split code/i.test(message)

    if (!isInvalidSplit) {
      throw error
    }

    console.warn("Paystack split code invalid. Clearing stored split and retrying initialization.", {
      organizerId: organizer.id,
      splitCode: paystackDetails.splitCode,
    })

    await updateOrganizerPaystackDetails(organizer.id, { paystack_split_code: null })

    const refreshedOrganizer = await getOrganizerById(organizer.id)
    if (!refreshedOrganizer) {
      throw error
    }

    paystackDetails = await ensureOrganizerPaystackDetails(refreshedOrganizer)
    console.log("[checkout] Paystack details refreshed after invalid split", {
      organizerId: refreshedOrganizer.id,
      subaccount: paystackDetails.subaccountCode,
      splitCode: paystackDetails.splitCode,
      percentageCharge: paystackDetails.percentageCharge,
      isMock: paystackDetails.isMock,
    })
    initializeResponse = await attemptInitialize()
  }

  await updateOrderPaystackReference(order.id, initializeResponse.data.reference)

  await createPaymentRecord({
    order_id: order.id,
    gateway: "paystack",
    gateway_reference: initializeResponse.data.reference,
    amount_cents: totalCents,
    currency: ticketType.currency,
    status: "pending",
    raw_response: initializeResponse,
  })

  return {
    authorizationUrl: initializeResponse.data.authorization_url,
    reference: initializeResponse.data.reference,
    amount: totalCents,
    currency: ticketType.currency,
  }
}

