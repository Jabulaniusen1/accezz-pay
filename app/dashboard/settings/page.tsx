import { notFound } from "next/navigation"

import { SettingsForm } from "@/components/dashboard/settings-form"
import { requireAuthenticatedUser } from "@/lib/auth"
import { getOrganizerById } from "@/lib/data/organizers"
import { listPaystackBanks } from "@/lib/paystack"

export default async function SettingsPage() {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id
  if (!organizerId) {
    notFound()
  }

  const organizer = await getOrganizerById(organizerId)
  if (!organizer) {
    notFound()
  }

  const banks = await listPaystackBanks().catch((error) => {
    console.error("Failed to load Paystack banks", error)
    return []
  })

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Branding & Settings</h1>
        <p className="text-foreground/70">Update your organizer profile and checkout experience.</p>
      </div>
      <SettingsForm organizer={organizer} banks={banks} />
    </div>
  )
}
