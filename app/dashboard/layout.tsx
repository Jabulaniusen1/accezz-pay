import type React from "react"

import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell"
import { requireAuthenticatedUser } from "@/lib/auth"
import { getOrganizerById } from "@/lib/data/organizers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id
  const organizer = organizerId ? await getOrganizerById(organizerId) : null
  const contactName =
    authUser.profile.display_name ??
    organizer?.contact_person ??
    organizer?.name ??
    authUser.email ??
    undefined

  return (
    <DashboardLayoutShell
      organizerName={organizer?.name ?? "AccezzPay"}
      contactName={contactName}
      branding={organizer?.branding ?? undefined}
    >
      {children}
    </DashboardLayoutShell>
  )
}
