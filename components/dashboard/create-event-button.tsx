'use client'

import { useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { AccountDetailsDialog } from '@/components/dashboard/account-details-dialog'

type CreateEventButtonProps = Omit<React.ComponentProps<typeof Button>, 'onClick'> & {
  hasAccountDetails: boolean
  profileHref: string
  redirectHref?: string
}

export function CreateEventButton({
  hasAccountDetails,
  profileHref,
  redirectHref = '/dashboard/events/new',
  children,
  ...buttonProps
}: CreateEventButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (hasAccountDetails) {
    return (
      <Link href={redirectHref} className="inline-flex">
        <Button {...buttonProps}>{children}</Button>
      </Link>
    )
  }

  return (
    <>
      <Button
        type="button"
        {...buttonProps}
        onClick={() => setDialogOpen(true)}
      >
        {children}
      </Button>
      <AccountDetailsDialog open={dialogOpen} onOpenChange={setDialogOpen} profileHref={profileHref} />
    </>
  )
}


