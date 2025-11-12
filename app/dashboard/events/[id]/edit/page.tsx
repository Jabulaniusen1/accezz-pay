import { notFound } from "next/navigation"

import { EventForm } from "@/components/dashboard/event-form"
import { requireOrganizerAccess } from "@/lib/auth"
import { getProductWithTicketTypes } from "@/lib/data/products"

type EditEventPageProps = {
  params: {
    id: string
  }
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const product = await getProductWithTicketTypes(params.id)
  if (!product) {
    notFound()
  }

  await requireOrganizerAccess(product.organizer_id)

  const metadata = (product.metadata as Record<string, string | undefined>) ?? {}
  const recurrenceCandidate = metadata.recurrenceFrequency ?? ""
  const allowedRecurrences = new Set(["weekly", "monthly", "semiannual", "annual"])

  const initialData = {
    productId: product.id,
    title: product.title ?? "",
    description: product.description ?? "",
    startDate: product.start_at ? new Date(product.start_at).toISOString().slice(0, 10) : "",
    startTime: product.start_at ? new Date(product.start_at).toISOString().slice(11, 16) : "",
    endDate: product.end_at ? new Date(product.end_at).toISOString().slice(0, 10) : "",
    endTime: product.end_at ? new Date(product.end_at).toISOString().slice(11, 16) : "",
    venueName: (product.venue as Record<string, string | undefined>)?.name ?? "",
    venueAddress: (product.venue as Record<string, string | undefined>)?.address ?? "",
    venueCity: (product.venue as Record<string, string | undefined>)?.city ?? "",
    venueState: (product.venue as Record<string, string | undefined>)?.state ?? "",
    venueCountry: (product.venue as Record<string, string | undefined>)?.country ?? "",
    heroImage: metadata.heroImage ?? "",
    recurrenceFrequency: allowedRecurrences.has(recurrenceCandidate) ? recurrenceCandidate : "none",
    tickets:
      product.ticket_types?.map((ticket) => ({
        id: ticket.id,
        name: ticket.name ?? "",
        price: ((ticket.price_cents ?? 0) / 100).toString(),
        currency: ticket.currency ?? "NGN",
        quantity: (ticket.quantity_total ?? 0).toString(),
        salesStart: ticket.sales_start ?? "",
        salesEnd: ticket.sales_end ?? "",
        perCustomerLimit: ticket.sales_limit_per_customer ? ticket.sales_limit_per_customer.toString() : "",
      })) ?? [],
  }

  return (
    <div className="p-8">
      <EventForm mode="update" initialData={initialData} />
    </div>
  )
}

