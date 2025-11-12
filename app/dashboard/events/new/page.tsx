import Link from "next/link"
import { FiLock } from "react-icons/fi"

import { EventForm } from "@/components/dashboard/event-form"
import { requireAuthenticatedUser } from "@/lib/auth"
import { getOrganizerById } from "@/lib/data/organizers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AccountDetailsRequired } from "@/components/dashboard/account-details-required"

function hasRequiredAccountDetails(organizer: Awaited<ReturnType<typeof getOrganizerById>>): boolean {
  if (!organizer) {
    return true
  }
  const bankDetails = organizer.bank_details as {
    accountNumber?: unknown
    accountName?: unknown
    bankCode?: unknown
  } | null
  if (!bankDetails) {
    return false
  }
  const accountNumber =
    typeof bankDetails.accountNumber === "string" ? bankDetails.accountNumber.trim() : ""
  const bankCode = typeof bankDetails.bankCode === "string" ? bankDetails.bankCode.trim() : ""
  const accountName =
    typeof bankDetails.accountName === "string" ? bankDetails.accountName.trim() : ""

  return Boolean(accountNumber && accountName && bankCode)
}

export default async function NewEventPage() {
  const authUser = await requireAuthenticatedUser()
  const organizerId = authUser.profile.organizer_id

  if (!organizerId && authUser.profile.role !== "superadmin") {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <FiLock className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">No organizer assigned</h2>
            <p className="text-foreground/70">Reach out to support to link your account to an organizer profile.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const organizer = organizerId ? await getOrganizerById(organizerId) : null
  const hasAccountDetails = hasRequiredAccountDetails(organizer)

  if (!hasAccountDetails) {
    return (
      <div className="p-8 space-y-6">
        <AccountDetailsRequired profileHref="/dashboard/settings?tab=profile" />
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Account details required</CardTitle>
            <CardDescription>
              You must add your account details first to recieve payment. Click Profile to add your detials now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings?tab=profile">
              <Button className="bg-primary hover:bg-accent text-primary-foreground">Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <EventForm mode="create" />
    </div>
  )
}
