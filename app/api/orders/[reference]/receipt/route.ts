import { NextResponse } from "next/server"

import { getOrderById, getOrderByReference, updateOrderStatus, updatePaymentStatusByReference } from "@/lib/data/orders"
import { getOrganizerById } from "@/lib/data/organizers"
import { getProductWithTicketTypes } from "@/lib/data/products"
import { listTicketsForOrder } from "@/lib/data/tickets"
import { buildReceiptPdfBuffer, getReceiptFileName } from "@/lib/receipts"
import { verifyPaystackTransaction } from "@/lib/paystack"

type RouteContext = {
  params: Promise<{
    reference: string
  }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { reference } = await params

  if (!reference) {
    return NextResponse.json({ error: "Reference is required" }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyPaystackTransaction(reference)
  } catch (error) {
    console.error("verifyPaystackTransaction failed", error)
    return NextResponse.json({ error: "Unable to verify payment. Try again shortly." }, { status: 502 })
  }

  if (!verification.status || verification.data.status !== "success") {
    return NextResponse.json({ error: "Payment not completed yet" }, { status: 409 })
  }

  let order = await getOrderByReference(reference)
  if (!order) {
    const metadataOrderId = (verification.data.metadata?.order_id as string | undefined) ?? null
    if (metadataOrderId) {
      order = await getOrderById(metadataOrderId)
    }
  }

  if (!order) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  if (order.status !== "paid") {
    await updateOrderStatus(order.id, "paid")
    await updatePaymentStatusByReference(reference, "paid", verification.data as Record<string, unknown>)
    order = {
      ...order,
      status: "paid",
    }
  }

  const organizer = await getOrganizerById(order.organizer_id)
  if (!organizer) {
    return NextResponse.json({ error: "Organizer not found" }, { status: 404 })
  }

  const product = await getProductWithTicketTypes(order.product_id)
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  const tickets = await listTicketsForOrder(order.id)
  const pdfBuffer = await buildReceiptPdfBuffer({ order, organizer, product, tickets })
  const pdfArray = new Uint8Array(pdfBuffer)

  return new NextResponse(pdfArray, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${getReceiptFileName(order)}"`,
      "Cache-Control": "no-store",
    },
  })
}


