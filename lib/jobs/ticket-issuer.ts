import { randomUUID } from "node:crypto"
import QRCode from "qrcode"

import { enqueueJob } from "./queue"
import { getOrderWithRelations, updateOrderStatus, updatePaymentStatus } from "@/lib/data/orders"
import { getProductWithTicketTypes } from "@/lib/data/products"
import { adjustTicketInventory } from "@/lib/data/products"
import { createTickets, listTicketsForOrder } from "@/lib/data/tickets"
import { uploadTicketQr } from "@/lib/storage"
import { createLedgerEntry } from "@/lib/data/orders"
import { getOrganizerById } from "@/lib/data/organizers"
import { sendEmail } from "@/lib/email"
import { buildPurchaseReceiptEmail } from "@/emails/purchase-receipt"
import { buildOrganizerNotificationEmail } from "@/emails/organizer-notification"
import { DEFAULT_TICKET_QR_PREFIX, PLATFORM_FEE_RATE, PAYSTACK_GATEWAY_FEE_RATE } from "@/lib/constants"
import { supabaseAdminClient } from "@/lib/supabase-admin"
import { buildReceiptPdfBuffer, getReceiptFileName } from "@/lib/receipts"
import type { Order, Payment, Ticket } from "@/types/database"

type TicketIssuancePayload = {
  orderId: string
  paymentId: string
  ticketTypeId: string
  quantity: number
  buyerName?: string
  buyerEmail: string
  buyerPhone?: string
  metadata?: Record<string, unknown>
}

async function generateTicketCode() {
  return `${DEFAULT_TICKET_QR_PREFIX}-${randomUUID().split("-")[0].toUpperCase()}`
}

async function saveTickets(order: Order, ticketTypeId: string, quantity: number) {
  const existingTickets = await listTicketsForOrder(order.id)
  if (existingTickets.length > 0) {
    return existingTickets
  }

  const product = await getProductWithTicketTypes(order.product_id)
  if (!product) {
    throw new Error("Product not found for ticket issuance")
  }

  await adjustTicketInventory(ticketTypeId, quantity)

  const ticketsPayload = []
  for (let i = 0; i < quantity; i++) {
    const code = await generateTicketCode()
    const qrBuffer = await QRCode.toBuffer(code, { width: 300 })
    const qrUrl = await uploadTicketQr(qrBuffer, `orders/${order.id}/${code}.png`)
    ticketsPayload.push({
      id: randomUUID(),
      order_id: order.id,
      product_id: order.product_id,
      ticket_type_id: ticketTypeId,
      ticket_code: code,
      qr_url: qrUrl,
      status: "unused" as Ticket["status"],
      attendee_name: order.buyer_name ?? null,
      attendee_email: order.buyer_email ?? null,
      attendee_phone: order.buyer_phone ?? null,
      metadata: {},
    })
  }

  return createTickets(ticketsPayload)
}

async function updateLedger(order: Order) {
  const { data, error } = await supabaseAdminClient.from("transactions_ledger").select("id").eq("order_id", order.id).maybeSingle()
  if (error && error.code !== "PGRST116") {
    throw error
  }
  if (data) {
    return
  }

  const totalCents = Number(order.total_cents)
  const gatewayFee = Math.round(totalCents * PAYSTACK_GATEWAY_FEE_RATE)
  const platformFee = Math.round(totalCents * PLATFORM_FEE_RATE)
  const organizerAmount = totalCents - gatewayFee - platformFee

  await createLedgerEntry({
    order_id: order.id,
    platform_fee_cents: platformFee,
    organizer_amount_cents: organizerAmount,
    gateway_fee_cents: gatewayFee,
    net_amount_cents: organizerAmount,
    currency: order.currency,
    status: "pending",
  })
}

async function sendNotifications(order: Order, payment: Payment, tickets: Awaited<ReturnType<typeof saveTickets>>) {
  const organizer = await getOrganizerById(order.organizer_id)
  if (!organizer) {
    throw new Error("Organizer not found for notifications")
  }

  const product = await getProductWithTicketTypes(order.product_id)
  if (!product) {
    throw new Error("Product not found for notifications")
  }

  const downloadLinks = tickets.map((ticket) => ({
    code: ticket.ticket_code,
    url: ticket.qr_url ?? "",
  }))

  const buyerEmail = buildPurchaseReceiptEmail({
    order,
    organizer,
    product,
    tickets,
    downloadLinks,
  })

  const receiptBuffer = await buildReceiptPdfBuffer({ order, organizer, product, tickets })
  const receiptAttachment = {
    filename: getReceiptFileName(order),
    content: receiptBuffer,
  }

  if (order.buyer_email) {
    await sendEmail({
      to: order.buyer_email,
      subject: buyerEmail.subject,
      html: buyerEmail.html,
      attachments: [receiptAttachment],
    })
  }

  const organizerEmail = buildOrganizerNotificationEmail({
    order,
    organizer,
    product,
  })

  await sendEmail({
    to: organizer.email,
    subject: organizerEmail.subject,
    html: organizerEmail.html,
  })
}

async function processTicketIssuance(payload: TicketIssuancePayload) {
  const orderWithRelations = await getOrderWithRelations(payload.orderId)
  if (!orderWithRelations) {
    throw new Error("Order not found for ticket issuance")
  }

  if (orderWithRelations.status === "paid") {
    const payment = orderWithRelations.payments?.find((p) => p.id === payload.paymentId)
    if (!payment) {
      throw new Error("Payment not found for ticket issuance")
    }

    const tickets = await saveTickets(orderWithRelations, payload.ticketTypeId, payload.quantity)
    await updateLedger(orderWithRelations)
    await sendNotifications(orderWithRelations, payment, tickets)
  } else if (orderWithRelations.status === "pending") {
    await updateOrderStatus(orderWithRelations.id, "paid")
    const payment = orderWithRelations.payments?.find((p) => p.id === payload.paymentId)
    if (payment) {
      await updatePaymentStatus(payment.id, "paid")
      const tickets = await saveTickets(orderWithRelations, payload.ticketTypeId, payload.quantity)
      await updateLedger(orderWithRelations)
      await sendNotifications(orderWithRelations, payment, tickets)
    }
  }
}

export function enqueueTicketIssuance(payload: TicketIssuancePayload) {
  enqueueJob(async () => {
    await processTicketIssuance(payload)
  })
}