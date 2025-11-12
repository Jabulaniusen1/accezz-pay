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
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-white/90 via-white to-white/80 p-8 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.45)] ring-1 ring-slate-100">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">Customize</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Branding & Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Refresh your storefront visuals and keep payout details current for seamless settlements.
        </p>
      </div>
      <SettingsForm organizer={organizer} banks={banks} />
    </div>
  )
}
