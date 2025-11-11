import { NextResponse } from "next/server"

import { verifyPaystackSignature } from "@/lib/paystack"
import { paystackWebhookSchema } from "@/lib/validators"
import { recordWebhookEvent, markWebhookProcessed } from "@/lib/data/webhooks"
import { getOrderByReference, updateOrderStatus, updatePaymentStatusByReference } from "@/lib/data/orders"
import { enqueueTicketIssuance } from "@/lib/jobs/ticket-issuer"
import { sendEmail } from "@/lib/email"
import { buildRefundNotificationEmail } from "@/emails/refund-notification"
import { getOrganizerById } from "@/lib/data/organizers"

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature")

  try {
    if (!verifyPaystackSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const payload = paystackWebhookSchema.parse(JSON.parse(rawBody))
    const webhookRecord = await recordWebhookEvent("paystack", payload.event, payload, signature ?? undefined)

    const data = payload.data as Record<string, any>
    const reference = data.reference as string | undefined
    const metadata = (data.metadata as Record<string, any>) ?? {}

    if (!reference) {
      console.warn("Paystack webhook missing reference")
      await markWebhookProcessed(webhookRecord.id)
      return NextResponse.json({ ok: true })
    }

    const order = await getOrderByReference(reference)
    if (!order) {
      console.warn("Order not found for reference", reference)
      await markWebhookProcessed(webhookRecord.id)
      return NextResponse.json({ ok: true })
    }

    if (payload.event === "charge.success") {
      if (order.status !== "paid") {
        await updateOrderStatus(order.id, "paid")
      }

      const payment = await updatePaymentStatusByReference(reference, "paid", data)

      const ticketTypeId = metadata.ticket_type_id ?? metadata.ticketTypeId
      const quantity = Number(metadata.quantity ?? 1)

      if (ticketTypeId) {
        enqueueTicketIssuance({
          orderId: order.id,
          paymentId: payment.id,
          ticketTypeId,
          quantity,
          buyerName: metadata.buyer_name ?? data.customer?.first_name,
          buyerEmail: order.buyer_email ?? data.customer?.email,
          buyerPhone: order.buyer_phone ?? data.customer?.phone,
          metadata,
        })
      }
    }

    if (payload.event === "charge.refund" || payload.event === "charge.refunded") {
      await updateOrderStatus(order.id, "refunded")
      await updatePaymentStatusByReference(reference, "refunded", data)
      const organizer = await getOrganizerById(order.organizer_id)
      if (organizer && order.buyer_email) {
        const refundEmail = buildRefundNotificationEmail({
          order,
          organizer,
          reason: data.message ?? "Refund processed",
        })
        await sendEmail({
          to: order.buyer_email,
          subject: refundEmail.subject,
          html: refundEmail.html,
        })
      }
    }

    await markWebhookProcessed(webhookRecord.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Paystack webhook error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, { status: 500 })
  }
}

