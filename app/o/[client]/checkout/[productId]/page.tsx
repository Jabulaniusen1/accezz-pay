import { notFound } from "next/navigation"

import { CheckoutClient } from "@/components/checkout/checkout-client"
import { getOrganizerBySlug, getOrganizerById } from "@/lib/data/organizers"
import { getProductWithTicketTypes } from "@/lib/data/products"

type OrganizerCheckoutPageProps = {
  params: { client: string; productId: string }
  searchParams: { redirect_url?: string }
}

export default async function OrganizerCheckoutPage({ params, searchParams }: OrganizerCheckoutPageProps) {
  if (!params.productId || params.productId === "undefined") {
    notFound()
  }

  let organizer = await getOrganizerBySlug(params.client)
  if (!organizer) {
    if (/^[0-9a-fA-F-]{36}$/.test(params.client)) {
      organizer = await getOrganizerById(params.client)
    }
    if (!organizer) {
      notFound()
    }
  }

  const product = await getProductWithTicketTypes(params.productId)
  if (!product || product.organizer_id !== organizer.id) {
    notFound()
  }

  const ticketTypes = product.ticket_types ?? []
  if (ticketTypes.length === 0) {
    throw new Error("No ticket types configured for this product")
  }

  return (
    <CheckoutClient
      organizer={organizer}
      product={product}
      ticketTypes={ticketTypes}
      redirectUrl={searchParams.redirect_url ?? null}
    />
  )
}

