import { NextResponse } from "next/server"

import { getOrderByReference } from "@/lib/data/orders"
import { getOrganizerById } from "@/lib/data/organizers"
import { getProductWithTicketTypes } from "@/lib/data/products"
import { listTicketsForOrder } from "@/lib/data/tickets"
import { buildReceiptPdfBuffer, getReceiptFileName } from "@/lib/receipts"

type RouteContext = {
  params: {
    reference: string
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { reference } = params

  if (!reference) {
    return NextResponse.json({ error: "Reference is required" }, { status: 400 })
  }

  const order = await getOrderByReference(reference)
  if (!order) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
  }

  if (order.status !== "paid") {
    return NextResponse.json({ error: "Receipt not available until payment is confirmed" }, { status: 409 })
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

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${getReceiptFileName(order)}"`,
      "Cache-Control": "no-store",
    },
  })
}


