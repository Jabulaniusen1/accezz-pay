import { supabaseAdminClient } from "./supabase-admin"

const TICKETS_BUCKET = process.env.SUPABASE_TICKETS_BUCKET ?? "tickets"
const ASSETS_BUCKET = process.env.SUPABASE_ASSETS_BUCKET ?? "assets"

export async function uploadTicketQr(buffer: Buffer, filePath: string, contentType = "image/png") {
  const { data, error } = await supabaseAdminClient.storage.from(TICKETS_BUCKET).upload(filePath, buffer, {
    contentType,
    upsert: true,
  })

  if (error) {
    console.error("uploadTicketQr error", error)
    throw error
  }
  const { data: publicUrl } = supabaseAdminClient.storage.from(TICKETS_BUCKET).getPublicUrl(data.path)
  return publicUrl.publicUrl
}

export async function uploadOrganizerLogo(buffer: Buffer, filePath: string, contentType = "image/png") {
  const { data, error } = await supabaseAdminClient.storage.from(ASSETS_BUCKET).upload(filePath, buffer, {
    contentType,
    cacheControl: "3600",
    upsert: true,
  })

  if (error) {
    console.error("uploadOrganizerLogo error", error)
    throw error
  }
  const { data: publicUrl } = supabaseAdminClient.storage.from(ASSETS_BUCKET).getPublicUrl(data.path)
  return publicUrl.publicUrl
}

export async function uploadEventHeroImage(buffer: Buffer, filePath: string, contentType = "image/png") {
  const { data, error } = await supabaseAdminClient.storage.from(ASSETS_BUCKET).upload(filePath, buffer, {
    contentType,
    cacheControl: "3600",
    upsert: true,
  })

  if (error) {
    console.error("uploadEventHeroImage error", error)
    throw error
  }
  const { data: publicUrl } = supabaseAdminClient.storage.from(ASSETS_BUCKET).getPublicUrl(data.path)
  return publicUrl.publicUrl
}

