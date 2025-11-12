'use client'

import { useEffect, useState } from 'react'

import { AccountDetailsDialog } from '@/components/dashboard/account-details-dialog'

type AccountDetailsRequiredProps = {
  profileHref: string
}

export function AccountDetailsRequired({ profileHref }: AccountDetailsRequiredProps) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(true)
  }, [])

  return <AccountDetailsDialog open={open} onOpenChange={setOpen} profileHref={profileHref} showCancel={false} />
}


