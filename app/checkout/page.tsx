import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { CheckoutClient } from "@/components/checkout/checkout-client"
import { getOrganizerById, getOrganizerBySlug } from "@/lib/data/organizers"
import { getProductWithTicketTypes } from "@/lib/data/products"

type CheckoutPageProps = {
  searchParams: Promise<{
    client_id?: string
    product_id?: string
    theme?: string
    redirect_url?: string
  }>
}

export const metadata: Metadata = {
  title: "Checkout | AccezzPay",
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams
  const organizerIdentifier = params.client_id ?? null
  const productId = params.product_id ?? null

  if (!organizerIdentifier || !productId || productId === "undefined") {
    notFound()
  }

  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[089abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    organizerIdentifier,
  )

  const organizer = isUuid
    ? await getOrganizerById(organizerIdentifier)
    : await getOrganizerBySlug(organizerIdentifier)

  if (!organizer) {
    notFound()
  }

  const product = await getProductWithTicketTypes(productId)
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
      redirectUrl={params.redirect_url ?? null}
    />
  )
}

