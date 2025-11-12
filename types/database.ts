export type KycStatus = "pending" | "review" | "approved" | "rejected"
export type PayoutSchedule = "daily" | "weekly" | "manual"
export type UserRole = "superadmin" | "organizer_admin" | "organizer_staff"
export type OrderStatus = "pending" | "paid" | "refunded" | "cancelled"
export type TicketStatus = "unused" | "used" | "cancelled"
export type LedgerStatus = "pending" | "settled" | "refunded" | "cancelled"
export type PaymentStatus = "initialized" | "pending" | "paid" | "failed" | "refunded" | "cancelled"
export type PayoutStatus = "scheduled" | "processing" | "paid" | "failed" | "cancelled"

export type OrganizerBranding = {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  logoUrl?: string
  currency?: string
  [key: string]: unknown
}

export type OrganizerBankDetails = {
  bankName?: string
  accountNumber?: string
  accountName?: string
  bankCode?: string
  [key: string]: unknown
}

export type Organizer = {
  id: string
  name: string
  slug: string
  email: string
  branding: OrganizerBranding
  kyc_status: KycStatus
  business_reg_number?: string | null
  tax_id?: string | null
  contact_person?: string | null
  phone?: string | null
  country?: string | null
  payout_schedule: PayoutSchedule
  bank_details: OrganizerBankDetails
  webhook_url?: string | null
  paystack_subaccount_code?: string | null
  paystack_split_code?: string | null
  paystack_percentage_charge?: number | null
  created_at: string
  updated_at: string
}

export type UserProfile = {
  id: string
  supabase_uid: string
  organizer_id?: string | null
  role: UserRole
  display_name?: string | null
  email?: string | null
  created_at: string
  updated_at: string
}

export type VenueInfo = {
  name?: string
  address?: string
  city?: string
  state?: string
  country?: string
  [key: string]: unknown
}

export type ProductMetadata = Record<string, unknown>

export type Product = {
  id: string
  organizer_id: string
  title: string
  description?: string | null
  metadata: ProductMetadata
  start_at?: string | null
  end_at?: string | null
  venue: VenueInfo
  created_at: string
  updated_at: string
}

export type TicketType = {
  description: string
  id: string
  product_id: string
  name: string
  sku: string
  price_cents: number
  currency: string
  quantity_total: number
  quantity_available: number
  sales_start?: string | null
  sales_end?: string | null
  sales_limit_per_customer?: number | null
  created_at: string
  updated_at: string
}

export type Order = {
  id: string
  organizer_id: string
  product_id: string
  total_cents: number
  currency: string
  status: OrderStatus
  buyer_name?: string | null
  buyer_email?: string | null
  buyer_phone?: string | null
  paystack_reference?: string | null
  redirect_url?: string | null
  created_at: string
  updated_at: string
}

export type Ticket = {
  id: string
  order_id: string
  product_id: string
  ticket_type_id: string
  ticket_code: string
  qr_url?: string | null
  status: TicketStatus
  attendee_name?: string | null
  attendee_email?: string | null
  attendee_phone?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type LedgerEntry = {
  id: string
  order_id: string
  platform_fee_cents: number
  organizer_amount_cents: number
  gateway_fee_cents: number
  net_amount_cents: number
  currency: string
  status: LedgerStatus
  created_at: string
  updated_at: string
}

export type Payment = {
  id: string
  order_id: string
  gateway: string
  gateway_reference?: string | null
  amount_cents: number
  currency: string
  status: PaymentStatus
  raw_response?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type WebhookEvent = {
  id: number
  gateway: string
  event_type: string
  payload: Record<string, unknown>
  signature?: string | null
  processed: boolean
  created_at: string
  processed_at?: string | null
}

export type Payout = {
  id: string
  organizer_id: string
  amount_cents: number
  currency: string
  scheduled_at?: string | null
  status: PayoutStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type AuditLog = {
  id: number
  user_id?: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
}

export type OrganizerWithRelations = Organizer & {
  products?: Product[]
}

export type ProductWithRelations = Product & {
  ticket_types?: TicketType[]
}

export type OrderWithRelations = Order & {
  tickets?: Ticket[]
  payments?: Payment[]
  ledger?: LedgerEntry[]
}

