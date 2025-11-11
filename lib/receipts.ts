import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import type { Order, Organizer, Product, Ticket } from "@/types/database"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"

type BuildReceiptParams = {
  order: Order
  organizer: Organizer
  product: Product
  tickets: Ticket[]
}

export function getReceiptFileName(order: Order) {
  return `receipt-${order.id}.pdf`
}

export async function buildReceiptPdfBuffer({ order, organizer, product, tickets }: BuildReceiptParams): Promise<Buffer> {
  const currency = order.currency ?? (organizer.branding?.currency as string) ?? "NGN"
  const createdAt = order.created_at ? formatDate(order.created_at) : formatDate(new Date().toISOString())
  const totalFormatted = formatCurrencyFromCents(Number(order.total_cents), currency)

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`Receipt ${order.id}`)
  pdfDoc.setAuthor(organizer.name)
  pdfDoc.setSubject(`${product.title} ticket purchase`)

  const page = pdfDoc.addPage()
  const { height } = page.getSize()
  const margin = 50
  let y = height - margin

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const lineHeight = 14

  const write = (text: string, options: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    const targetFont = options.bold ? fontBold : font
    const color = options.color ?? rgb(0, 0, 0)
    page.drawText(text, {
      x: margin,
      y,
      size: 12,
      font: targetFont,
      color,
    })
    y -= lineHeight
  }

  const writeBlank = (amount = 1) => {
    y -= lineHeight * amount
  }

  write(organizer.name, { bold: true, color: rgb(0.08, 0.08, 0.12) })
  if (organizer.email) write(organizer.email, { color: rgb(0.33, 0.33, 0.36) })
  if (organizer.phone) write(organizer.phone, { color: rgb(0.33, 0.33, 0.36) })
  if (organizer.branding?.website) write(String(organizer.branding.website), { color: rgb(0.33, 0.33, 0.36) })

  writeBlank()
  write("Receipt", { bold: true })

  writeBlank(0.5)
  write(`Order ID: ${order.id}`)
  if (order.paystack_reference) write(`Payment Reference: ${order.paystack_reference}`)
  write(`Date: ${createdAt}`)

  writeBlank()
  write("Billed To", { bold: true })
  if (order.buyer_name) write(order.buyer_name)
  if (order.buyer_email) write(order.buyer_email)
  if (order.buyer_phone) write(order.buyer_phone)

  writeBlank()
  write("Event Details", { bold: true })
  write(product.title)
  if (product.start_at) write(`Starts: ${formatDate(product.start_at)}`)
  if (product.end_at) write(`Ends: ${formatDate(product.end_at)}`)
  if (product.venue?.name) write(`Venue: ${product.venue.name}`)

  writeBlank()
  write("Tickets", { bold: true })
  if (tickets.length === 0) {
    write("Tickets are being generated. You will receive them shortly.")
  } else {
    tickets.forEach((ticket, index) => {
      write(`${index + 1}. Code: ${ticket.ticket_code}`)
      if (ticket.attendee_name || order.buyer_name) {
        write(`   Attendee: ${ticket.attendee_name ?? order.buyer_name ?? ""}`)
      }
      if (ticket.attendee_email || order.buyer_email) {
        write(`   Email: ${ticket.attendee_email ?? order.buyer_email ?? ""}`)
      }
      writeBlank(0.2)
    })
  }

  writeBlank()
  write("Summary", { bold: true })
  write(`Tickets Purchased: ${tickets.length}`)
  write(`Amount Paid: ${totalFormatted}`)

  writeBlank(2)
  page.drawText("Thank you for choosing AccezzPay.", {
    x: margin,
    y,
    font,
    size: 10,
    color: rgb(0.4, 0.4, 0.44),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}


