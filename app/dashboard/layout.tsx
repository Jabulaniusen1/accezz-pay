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

  return (
    <DashboardLayoutShell organizerName={organizer?.name ?? "AccezzPay"} branding={organizer?.branding ?? undefined}>
      {children}
    </DashboardLayoutShell>
  )
}
