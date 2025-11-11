import { NextResponse } from "next/server"
import { z } from "zod"

import { requireAuthenticatedUser } from "@/lib/auth"
import { resolvePaystackBankAccount } from "@/lib/paystack"

const ResolveAccountSchema = z.object({
  bankCode: z.string().min(2).max(10),
  accountNumber: z
    .string()
    .regex(/^\d{10,11}$/, "Account number must contain 10 or 11 digits."),
})

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser()
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 },
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON payload.",
      },
      { status: 400 },
    )
  }

  const parsed = ResolveAccountSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Request is missing required fields.",
      },
      { status: 400 },
    )
  }

  try {
    const result = await resolvePaystackBankAccount(parsed.data.bankCode.trim(), parsed.data.accountNumber.trim())
    return NextResponse.json({
      success: true,
      data: {
        accountName: result.accountName,
        accountNumber: result.accountNumber,
        isMock: result.isMock ?? false,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to validate bank details with Paystack.",
      },
      { status: 400 },
    )
  }
}


