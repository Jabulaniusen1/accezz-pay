"use server"

import { z } from "zod"

import { requireAuthenticatedUser } from "@/lib/auth"
import { updateOrganizerBranding, updateOrganizerSettings } from "@/lib/data/organizers"
import { uploadOrganizerLogo } from "@/lib/storage"
import { organizerBrandingSchema, organizerSettingsSchema } from "@/lib/validators"
import { ensureOrganizerPaystackDetails, resolvePaystackBankAccount } from "@/lib/paystack"

const BrandingFormSchema = organizerBrandingSchema.extend({
  organizerId: z.string().uuid(),
})

const SettingsFormSchema = organizerSettingsSchema.extend({
  organizerId: z.string().uuid(),
})

export async function saveBranding(formData: FormData) {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id
  if (!organizerId) {
    throw new Error("Organizer not found for user")
  }

  const payload = BrandingFormSchema.parse({
    organizerId,
    primaryColor: formData.get("primaryColor")?.toString(),
    secondaryColor: formData.get("secondaryColor")?.toString(),
    fontFamily: formData.get("fontFamily")?.toString(),
  })

  const brandingUpdates: Record<string, unknown> = {
    primaryColor: payload.primaryColor,
    secondaryColor: payload.secondaryColor,
    fontFamily: payload.fontFamily,
  }

  const logoFile = formData.get("logo") as File | null
  if (logoFile && logoFile.size > 0) {
    const arrayBuffer = await logoFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extension = logoFile.type === "image/png" ? "png" : logoFile.type === "image/jpeg" ? "jpg" : "bin"
    const publicUrl = await uploadOrganizerLogo(buffer, `organizers/${organizerId}/logo.${extension}`, logoFile.type || "image/png")
    brandingUpdates.logoUrl = publicUrl
  }

  await updateOrganizerBranding(organizerId, brandingUpdates)
  return { success: true }
}

export async function saveSettings(formData: FormData) {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id
  if (!organizerId) {
    throw new Error("Organizer not found for user")
  }

  const parsed = SettingsFormSchema.parse({
    organizerId,
    contact_person: formData.get("contact_person")?.toString(),
    phone: formData.get("phone")?.toString(),
    country: formData.get("country")?.toString(),
    webhook_url: formData.get("webhook_url")?.toString() || null,
    payout_schedule: formData.get("payout_schedule")?.toString() as "daily" | "weekly" | "manual" | undefined,
    bank_details: {
      bankName: formData.get("bank_name")?.toString(),
      accountNumber: formData.get("account_number")?.toString(),
      accountName: formData.get("account_name")?.toString(),
      bankCode: formData.get("bank_code")?.toString(),
    },
  })

  const bankDetails = parsed.bank_details ? { ...parsed.bank_details } : undefined
  let resolutionMessage: string | undefined

  if (bankDetails) {
    const accountNumber = bankDetails.accountNumber ? String(bankDetails.accountNumber).replace(/\D/g, "") : ""
    const bankCode = bankDetails.bankCode ? String(bankDetails.bankCode).trim() : ""
    const bankName = bankDetails.bankName ? String(bankDetails.bankName).trim() : ""

    if (accountNumber) {
      bankDetails.accountNumber = accountNumber
    }
    if (bankCode) {
      bankDetails.bankCode = bankCode
    }
    if (bankName) {
      bankDetails.bankName = bankName
    }

    if (accountNumber || bankCode) {
      if (!accountNumber || !bankCode) {
        return {
          success: false,
          error: "Provide both bank code and account number to validate payout details.",
        }
      }

      try {
        const resolution = await resolvePaystackBankAccount(bankCode, accountNumber)
        const existingName =
          typeof bankDetails.accountName === "string" ? bankDetails.accountName.trim() : undefined
        bankDetails.accountName = existingName && existingName.length ? existingName : resolution.accountName
        resolutionMessage = resolution.isMock
          ? `Bank details validated (mock mode).`
          : `Bank details validated for ${resolution.accountName}.`
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unable to validate bank details with Paystack.",
        }
      }
    }
  }

  const updatedOrganizer = await updateOrganizerSettings(organizerId, {
    contact_person: parsed.contact_person ?? null,
    phone: parsed.phone ?? null,
    country: parsed.country ?? null,
    webhook_url: parsed.webhook_url ?? null,
    payout_schedule: parsed.payout_schedule,
    bank_details: bankDetails,
  })

  try {
    const integration = await ensureOrganizerPaystackDetails(updatedOrganizer)
    return {
      success: true,
      paystack: integration,
      resolution: resolutionMessage,
    }
  } catch (error) {
    console.error("Failed to sync Paystack subaccount", error)
    return {
      success: true,
      warning: error instanceof Error ? error.message : "Unable to sync Paystack subaccount. Please verify bank details.",
      resolution: resolutionMessage,
    }
  }
}

