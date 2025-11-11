import type { Order, Organizer, Product } from "@/types/database"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"

type OrganizerNotificationParams = {
  order: Order
  organizer: Organizer
  product: Product
}

export function buildOrganizerNotificationEmail({ order, organizer, product }: OrganizerNotificationParams) {
  const currency = order.currency ?? (organizer.branding?.currency as string) ?? "NGN"
  const totalFormatted = formatCurrencyFromCents(Number(order.total_cents), currency)

  return {
    subject: `New order ${order.id} for ${product.title}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; color: #111827;">
        <h2 style="color:${organizer.branding?.primaryColor ?? "#6B21A8"};">New Order Received</h2>
        <p>An order was completed on ${formatDate(order.created_at)}.</p>
        <p><strong>Buyer:</strong> ${order.buyer_name ?? "Unknown"} (${order.buyer_email ?? "no email"})</p>
        <p><strong>Order Total:</strong> ${totalFormatted}</p>
        <p><strong>Product:</strong> ${product.title}</p>
        <p>Sign in to your dashboard to view tickets and attendee details.</p>
      </div>
    `,
  }
}

