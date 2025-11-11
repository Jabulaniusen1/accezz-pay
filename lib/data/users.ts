import { supabaseAdminClient } from "../supabase-admin"
import type { UserProfile } from "@/types/database"

export async function getUserBySupabaseId(supabaseUid: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdminClient.from("users").select("*").eq("supabase_uid", supabaseUid).single()
  if (error && error.code !== "PGRST116") {
    console.error("getUserBySupabaseId error", error)
    throw error
  }
  return (data as UserProfile) ?? null
}

export async function createUserProfile(input: {
  supabase_uid: string
  organizer_id?: string | null
  role?: UserProfile["role"]
  display_name?: string | null
  email?: string | null
}): Promise<UserProfile> {
  const { data, error } = await supabaseAdminClient
    .from("users")
    .insert({
      ...input,
      role: input.role ?? "organizer_staff",
    })
    .select("*")
    .single()

  if (error) {
    console.error("createUserProfile error", error)
    throw error
  }
  return data as UserProfile
}

export async function updateUserRole(userId: string, role: UserProfile["role"]): Promise<UserProfile> {
  const { data, error } = await supabaseAdminClient
    .from("users")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("*")
    .single()

  if (error) {
    console.error("updateUserRole error", error)
    throw error
  }
  return data as UserProfile
}

export async function attachUserToOrganizer(userId: string, organizerId: string): Promise<UserProfile> {
  const { data, error } = await supabaseAdminClient
    .from("users")
    .update({
      organizer_id: organizerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("*")
    .single()

  if (error) {
    console.error("attachUserToOrganizer error", error)
    throw error
  }
  return data as UserProfile
}

