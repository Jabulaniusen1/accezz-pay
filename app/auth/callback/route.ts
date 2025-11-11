import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { getUserBySupabaseId, createUserProfile, attachUserToOrganizer } from "@/lib/data/users"
import { createOrganizer } from "@/lib/data/organizers"
import { supabaseAdminClient } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL("/auth/error", request.url))
    }

    const cookieStore = await cookies()
    const cookieUpdates: { name: string; value: string; options?: any }[] = []

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          cookieUpdates.push({ name, value, options })
        },
        remove(name: string, options?: any) {
          cookieUpdates.push({ name, value: "", options: { ...options, maxAge: 0 } })
        },
      },
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        let profile = await getUserBySupabaseId(user.id)
        let organizerId = profile?.organizer_id ?? null

        if (!organizerId) {
          const orgName =
            (user.user_metadata?.org_name as string) ??
            (user.user_metadata?.name as string) ??
            user.email?.split("@")[0] ??
            "My Organizer"

          const slugBase = orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40)

          let slug = slugBase || `org-${user.id.slice(0, 8)}`
          let suffix = 1
          while (true) {
            const { data: existingSlug } = await supabaseAdminClient
              .from("organizers")
              .select("id")
              .eq("slug", slug)
              .maybeSingle()

            if (!existingSlug) {
              break
            }
            suffix += 1
            slug = `${slugBase}-${suffix}`
          }

          const organizer = await createOrganizer({
            name: orgName,
            slug,
            email: user.email ?? "",
            branding: {
              primaryColor: "#6B21A8",
              secondaryColor: "#F3E8FF",
            },
            contact_person: (user.user_metadata?.name as string) ?? null,
            phone: (user.user_metadata?.phone as string) ?? null,
          })

          organizerId = organizer.id
        }

        if (profile) {
          if (!profile.organizer_id && organizerId) {
            profile = await attachUserToOrganizer(profile.id, organizerId)
          }
        } else {
          profile = await createUserProfile({
            supabase_uid: user.id,
            email: user.email,
            display_name: (user.user_metadata?.name as string) ?? null,
            role: "organizer_admin",
            organizer_id: organizerId,
          })
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host")
      const proto = request.headers.get("x-forwarded-proto")
      const host = forwardedHost || request.nextUrl.host
      const redirectUrl = proto ? `${proto}://${host}${next}` : `http://${host}${next}`
      const response = NextResponse.redirect(redirectUrl)
      cookieUpdates.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      return response
    }
  }

  // redirect the user to an error page with instructions
  return NextResponse.redirect(new URL("/auth/error", request.url))
}
