"use client"

// This component can be used to embed the checkout in an iframe on other websites
interface CheckoutEmbedProps {
  eventId: string
  height?: string
}

export function CheckoutEmbed({ eventId, height = "800px" }: CheckoutEmbedProps) {
  const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/${eventId}`

  return (
    <iframe
      src={checkoutUrl}
      width="100%"
      height={height}
      frameBorder="0"
      title={`AccezzPay Checkout - Event ${eventId}`}
      allow="payment"
    />
  )
}
