import type { Order, Organizer, Product, Ticket } from "@/types/database"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"

type PurchaseReceiptParams = {
  order: Order
  organizer: Organizer
  product: Product
  tickets: Ticket[]
  downloadLinks: Array<{ code: string; url: string }>
}

export function buildPurchaseReceiptEmail({ order, organizer, product, tickets, downloadLinks }: PurchaseReceiptParams) {
  const currency = order.currency ?? (organizer.branding?.currency as string) ?? "NGN"
  const totalFormatted = formatCurrencyFromCents(Number(order.total_cents), currency)
  const eventDates =
    product.start_at && product.end_at
      ? `${formatDate(product.start_at)} - ${formatDate(product.end_at)}`
      : product.start_at
        ? formatDate(product.start_at)
        : "Flexible schedule"

  const ticketsList = tickets
    .map((ticket) => {
      const link = downloadLinks.find((item) => item.code === ticket.ticket_code)
      return `<li style="margin-bottom:12px;">
        <strong>${ticket.ticket_code}</strong><br/>
        ${ticket.attendee_name ?? order.buyer_name ?? ""}<br/>
        <a href="${link?.url ?? "#"}" style="color:${organizer.branding?.primaryColor ?? "#6B21A8"}">Download ticket</a>
      </li>`
    })
    .join("")

  return {
    subject: `Your tickets for ${product.title}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; color: #111827;">
        <h2 style="color:${organizer.branding?.primaryColor ?? "#6B21A8"};">${organizer.name}</h2>
        <p>Hi ${order.buyer_name ?? "there"},</p>
        <p>Thank you for your purchase. Your order <strong>${order.id}</strong> is confirmed. A PDF receipt is attached for your records.</p>
        <h3>${product.title}</h3>
        <p>${eventDates}</p>
        <p>Total Paid: <strong>${totalFormatted}</strong></p>
        <h4>Your Tickets</h4>
        <ul style="list-style:none;padding-left:0;">${ticketsList}</ul>
        <p>If you have any questions, reply to this email or contact ${organizer.contact_person ?? organizer.email}.</p>
        <p>— ${organizer.name}</p>
      </div>
    `,
  }
}

