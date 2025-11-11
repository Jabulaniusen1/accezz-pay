import crypto, { randomUUID } from "node:crypto"

import { PLATFORM_FEE_PERCENT } from "@/lib/constants"
import { updateOrganizerPaystackDetails } from "@/lib/data/organizers"
import type { Organizer } from "@/types/database"

const paystackBaseUrl = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co"
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY
const paystackEnableSplits = process.env.PAYSTACK_ENABLE_SPLITS === "true"

if (!paystackSecretKey) {
  console.warn("PAYSTACK_SECRET_KEY is not set. Payment initialization will run in mock mode.")
}

if (!paystackPublicKey) {
  console.warn("PAYSTACK_PUBLIC_KEY is not set. SDK initialization will lack public key until provided.")
}

type InitializeTransactionParams = {
  email: string
  amount: number
  reference: string
  currency?: string
  metadata?: Record<string, unknown>
  callback_url?: string
  channels?: string[]
  subaccount?: string
  split_code?: string
  bearer?: "account" | "subaccount" | "all-proportional" | "all"
}

export type PaystackInitializeResponse = {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export async function initializePaystackTransaction(params: InitializeTransactionParams): Promise<PaystackInitializeResponse> {
  if (!paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is required to initialize transactions")
  }

  const response = await fetch(`${paystackBaseUrl}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...params,
      currency: params.currency ?? "NGN",
      channels: params.channels ?? ["card", "bank", "ussd", "qr", "mobile_money"],
      subaccount: params.subaccount,
      split_code: params.split_code,
      bearer: params.bearer,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Paystack initialize failed: ${response.status} ${errorBody}`)
    console.log("Paystack initialize response", response)
  }

  return (await response.json()) as PaystackInitializeResponse
}

export type PaystackVerifyResponse = {
  status: boolean
  message: string
  data: {
    status: string
    reference: string
    amount: number
    currency: string
    paid_at: string
    created_at: string
    channel: string
    metadata: Record<string, unknown>
    customer: {
      email: string
      first_name?: string
      last_name?: string
      phone?: string
    }
  }
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  if (!paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is required to verify transactions")
  }

  const response = await fetch(`${paystackBaseUrl}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Paystack verify failed: ${response.status} ${errorBody}`)
  }

  return (await response.json()) as PaystackVerifyResponse
}

export function verifyPaystackSignature(rawBody: string, signature?: string | null): boolean {
  if (!signature) return false
  if (!paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is required to verify webhook signatures")
  }
  const computed = crypto.createHmac("sha512", paystackSecretKey).update(rawBody).digest("hex")
  return computed === signature
}

export function getPaystackPublicKey() {
  return paystackPublicKey
}

type CreateSubaccountParams = {
  business_name: string
  settlement_bank: string
  account_number: string
  percentage_charge: number
  account_name?: string
  email?: string
}

type PaystackSubaccountResponse = {
  status: boolean
  message: string
  data: {
    subaccount_code: string
    business_name: string
    settlement_bank: string
    account_number: string
  }
}

export async function createPaystackSubaccount(params: CreateSubaccountParams): Promise<PaystackSubaccountResponse> {
  if (!paystackSecretKey) {
    const mockCode = `SUB_${randomUUID().slice(0, 8)}`
    return {
      status: true,
      message: "Mock subaccount created",
      data: {
        subaccount_code: mockCode,
        business_name: params.business_name,
        settlement_bank: params.settlement_bank,
        account_number: params.account_number,
      },
    }
  }

  const response = await fetch(`${paystackBaseUrl}/subaccount`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: params.business_name,
      settlement_bank: params.settlement_bank,
      account_number: params.account_number,
      percentage_charge: params.percentage_charge,
      account_name: params.account_name,
      business_email: params.email,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Paystack subaccount creation failed: ${response.status} ${body}`)
  }

  return (await response.json()) as PaystackSubaccountResponse
}

type CreateSplitParams = {
  name: string
  subaccount_code: string
  percentage_share: number
  currency?: string
}

type PaystackSplitResponse = {
  status: boolean
  message: string
  data: {
    id: number
    split_code: string
  }
}

export type PaystackBank = {
  name: string
  code: string
  slug?: string | null
}

type PaystackBankListResponse = {
  status: boolean
  message: string
  data: Array<{
    name: string
    slug: string | null
    code: string
    currency: string
    country: string
    active: boolean
  }>
}

const BANK_CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour
const FALLBACK_BANKS: PaystackBank[] = [
  { name: "Access Bank", code: "044", slug: "access-bank" },
  { name: "GTBank", code: "058", slug: "guaranty-trust-bank" },
  { name: "First Bank", code: "011", slug: "first-bank" },
  { name: "United Bank for Africa", code: "033", slug: "uba" },
]

let cachedBanks:
  | {
      expiresAt: number
      data: PaystackBank[]
    }
  | null = null

export async function listPaystackBanks(): Promise<PaystackBank[]> {
  if (cachedBanks && cachedBanks.expiresAt > Date.now()) {
    return cachedBanks.data
  }

  if (!paystackSecretKey) {
    const fallbackBanks = [...FALLBACK_BANKS]
    cachedBanks = {
      data: fallbackBanks,
      expiresAt: Date.now() + BANK_CACHE_TTL_MS,
    }
    return fallbackBanks
  }

  try {
    const response = await fetch(`${paystackBaseUrl}/bank?currency=NGN`, {
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Failed to fetch Paystack banks: ${response.status} ${body}`)
    }

    const payload = (await response.json()) as PaystackBankListResponse
    if (!payload.status || !Array.isArray(payload.data)) {
      throw new Error(payload.message || "Paystack did not return any banks.")
    }

    const banks = payload.data
      .filter((bank) => bank.active && bank.code)
      .map<PaystackBank>((bank) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    cachedBanks = {
      data: banks,
      expiresAt: Date.now() + BANK_CACHE_TTL_MS,
    }

    return banks
  } catch (error) {
    console.error("listPaystackBanks error", error)
    if (cachedBanks) {
      return cachedBanks.data
    }
    const fallbackBanks = [...FALLBACK_BANKS]
    cachedBanks = {
      data: fallbackBanks,
      expiresAt: Date.now() + BANK_CACHE_TTL_MS,
    }
    return fallbackBanks
  }
}

type PaystackResolveAccountResponse = {
  status: boolean
  message: string
  data?: {
    account_number: string
    account_name: string
    bank_id: number
  }
}

export async function resolvePaystackBankAccount(bankCode: string, accountNumber: string) {
  if (!bankCode || !accountNumber) {
    throw new Error("Bank code and account number are required to validate bank details.")
  }

  const sanitizedBankCode = bankCode.trim()
  const sanitizedAccountNumber = accountNumber.replace(/\D/g, "")

  if (!/^\d{10,11}$/.test(sanitizedAccountNumber)) {
    throw new Error("Account number must contain 10 or 11 digits.")
  }

  if (!paystackSecretKey) {
    const mockName = `Test Account • ${sanitizedAccountNumber.slice(-4)}`
    return {
      accountName: mockName,
      accountNumber: sanitizedAccountNumber,
      isMock: true,
    }
  }

  const params = new URLSearchParams({
    bank_code: sanitizedBankCode,
    account_number: sanitizedAccountNumber,
  })

  const response = await fetch(`${paystackBaseUrl}/bank/resolve?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Unable to validate bank details: ${response.status} ${body}`)
  }

  const payload = (await response.json()) as PaystackResolveAccountResponse
  if (!payload.status || !payload.data?.account_name) {
    throw new Error(payload.message || "Paystack could not resolve the supplied bank details.")
  }

  return {
    accountName: payload.data.account_name.trim(),
    accountNumber: payload.data.account_number,
    isMock: false,
  }
}

export async function createPaystackPercentageSplit(params: CreateSplitParams): Promise<PaystackSplitResponse> {
  if (!paystackEnableSplits) {
    throw new Error("Paystack split support disabled via PAYSTACK_ENABLE_SPLITS")
  }
  if (!paystackSecretKey) {
    return {
      status: true,
      message: "Mock split created",
      data: {
        id: Math.floor(Math.random() * 100000),
        split_code: `SPL_${randomUUID().slice(0, 8)}`,
      },
    }
  }

  const response = await fetch(`${paystackBaseUrl}/split`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: params.name,
      type: "percentage",
      currency: params.currency ?? "NGN",
      bearer_type: "account",
      bearer_subaccount: params.subaccount_code,
      subaccounts: [
        {
          subaccount: params.subaccount_code,
          share: Math.max(0, Math.min(100, params.percentage_share)),
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("createPaystackPercentageSplit error", {
      status: response.status,
      body,
      params,
    })

    if (response.status >= 500) {
      console.warn("Falling back to mock split due to Paystack server error.")
      return {
        status: true,
        message: "Mock split created (Paystack error fallback)",
        data: {
          id: Math.floor(Math.random() * 100000),
          split_code: `SPL_${randomUUID().slice(0, 8)}`,
        },
      }
    }

    throw new Error(`Paystack split creation failed: ${response.status} ${body}`)
  }

  return (await response.json()) as PaystackSplitResponse
}

export async function ensureOrganizerPaystackDetails(organizer: Organizer) {
  const percentageCharge = organizer.paystack_percentage_charge ?? PLATFORM_FEE_PERCENT

  let subaccountCode = organizer.paystack_subaccount_code ?? null
  if (!subaccountCode) {
    const bankDetails = organizer.bank_details ?? {}
    const settlementBank =
      (bankDetails.bankCode as string | undefined) ??
      (bankDetails.bank_code as string | undefined) ??
      (bankDetails.settlementBank as string | undefined)
    const accountNumber =
      (bankDetails.accountNumber as string | undefined) ??
      (bankDetails.account_number as string | undefined)

    if (!settlementBank || !accountNumber) {
      if (paystackSecretKey) {
        throw new Error("Organizer bank details are incomplete. Provide settlement bank code and account number.")
      }
      subaccountCode = `SUB_${randomUUID().slice(0, 8)}`
      await updateOrganizerPaystackDetails(organizer.id, {
        paystack_subaccount_code: subaccountCode,
        paystack_percentage_charge: percentageCharge,
      })
    } else {
      const subaccountResponse = await createPaystackSubaccount({
        business_name: organizer.name,
        settlement_bank: settlementBank,
        account_number: accountNumber,
        percentage_charge: percentageCharge,
        account_name: (bankDetails.accountName as string | undefined) ?? organizer.name,
        email: organizer.email,
      })

      subaccountCode = subaccountResponse.data.subaccount_code
      await updateOrganizerPaystackDetails(organizer.id, {
        paystack_subaccount_code: subaccountCode,
        paystack_percentage_charge: percentageCharge,
      })
    }
  } else if (!organizer.paystack_percentage_charge) {
    await updateOrganizerPaystackDetails(organizer.id, {
      paystack_percentage_charge: percentageCharge,
    })
  }

  let splitCode = organizer.paystack_split_code ?? null
  if (!splitCode && paystackEnableSplits) {
    try {
      const splitResponse = await createPaystackPercentageSplit({
        name: `AccezzPay :: ${organizer.name}`,
        subaccount_code: subaccountCode,
        percentage_share: 100 - percentageCharge,
      })
      splitCode = splitResponse.data.split_code
      await updateOrganizerPaystackDetails(organizer.id, {
        paystack_split_code: splitCode,
      })
    } catch (error) {
      console.warn("createPaystackPercentageSplit skipped", {
        organizerId: organizer.id,
        error: error instanceof Error ? error.message : error,
      })
      splitCode = null
      if (organizer.paystack_split_code) {
        await updateOrganizerPaystackDetails(organizer.id, {
          paystack_split_code: null,
        })
      }
    }
  }

  return {
    subaccountCode,
    splitCode,
    percentageCharge,
    isMock: !paystackSecretKey,
  }
}

