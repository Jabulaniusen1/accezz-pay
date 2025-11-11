export const DEFAULT_BRAND_COLOR = "#6B21A8"
export const DEFAULT_SECONDARY_COLOR = "#F3E8FF"
export const DEFAULT_FONT_FAMILY = "Inter"
export const DEFAULT_TICKET_QR_PREFIX = "ACCEZZ"

export const PAYSTACK_CHANNELS = ["card", "bank", "ussd", "qr", "mobile_money"] as const

export const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const

export const MAX_TICKETS_PER_CUSTOMER = 10

export const PLATFORM_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT ?? "3")
export const PLATFORM_FEE_RATE = PLATFORM_FEE_PERCENT / 100

export const PAYSTACK_GATEWAY_FEE_RATE = Number(process.env.NEXT_PUBLIC_PAYSTACK_GATEWAY_FEE_PERCENT ?? "1.5") / 100

