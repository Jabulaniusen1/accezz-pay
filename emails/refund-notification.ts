import type { Order, Organizer } from "@/types/database"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"

type RefundNotificationParams = {
  order: Order
  organizer: Organizer
  reason?: string
}

export function buildRefundNotificationEmail({ order, organizer, reason }: RefundNotificationParams) {
  const currency = order.currency ?? (organizer.branding?.currency as string) ?? "NGN"
  const totalFormatted = formatCurrencyFromCents(Number(order.total_cents), currency)

  return {
    subject: `Refund processed for order ${order.id}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; color: #111827;">
        <h2 style="color:${organizer.branding?.primaryColor ?? "#6B21A8"};">Refund Confirmation</h2>
        <p>Hi ${order.buyer_name ?? "there"},</p>
        <p>Your order <strong>${order.id}</strong> placed on ${formatDate(order.created_at)} has been refunded.</p>
        <p><strong>Amount:</strong> ${totalFormatted}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>Refunds typically take 5-10 business days to reflect, depending on your bank.</p>
        <p>If you have questions, contact ${organizer.contact_person ?? organizer.name} via ${organizer.email}.</p>
      </div>
    `,
  }
}

