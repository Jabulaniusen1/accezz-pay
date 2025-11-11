"use server"

import { randomUUID } from "node:crypto"

import { requireAuthenticatedUser } from "@/lib/auth"
import { uploadEventHeroImage } from "@/lib/storage"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

export async function uploadEventHeroAction(formData: FormData) {
  await requireAuthenticatedUser()

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return {
      success: false,
      error: "No file provided.",
    }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported image type. Please upload a PNG, JPEG, or WEBP file.",
    }
  }

  if (file.size <= 0) {
    return {
      success: false,
      error: "The selected file is empty.",
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: "Image exceeds 5MB. Please upload a smaller file.",
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg"

  const storagePath = `events/hero/${randomUUID()}.${extension}`

  try {
    const url = await uploadEventHeroImage(buffer, storagePath, file.type)
    return {
      success: true,
      url,
    }
  } catch (error) {
    console.error("uploadEventHeroAction error", error)
    return {
      success: false,
      error: "We couldn't upload that image. Please try again.",
    }
  }
}


