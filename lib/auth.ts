import { cookies } from "next/headers"
import { createServerSupabaseClient } from "./supabase-server"
import { getUserBySupabaseId } from "./data/users"
import type { UserProfile } from "@/types/database"
import { AppError } from "./errors"

export type AuthenticatedUser = {
  supabaseUserId: string
  email?: string
  profile: UserProfile
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const profile = await getUserBySupabaseId(user.id)

  if (!profile) {
    throw new AppError("User profile not found", 403)
  }

  return {
    supabaseUserId: user.id,
    email: user.email ?? undefined,
    profile,
  }
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const authUser = await getAuthenticatedUser()
  if (!authUser) {
    throw new AppError("Unauthorized", 401)
  }
  return authUser
}

export async function requireOrganizerAccess(organizerId: string): Promise<AuthenticatedUser> {
  const authUser = await requireAuthenticatedUser()
  const { profile } = authUser
  if (profile.role === "superadmin") {
    return authUser
  }
  if (profile.organizer_id !== organizerId) {
    throw new AppError("Forbidden", 403)
  }
  return authUser
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete("sb-access-token")
  cookieStore.delete("sb-refresh-token")
}

