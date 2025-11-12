'use client'

import Link from 'next/link'
import { useCallback } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AccountDetailsDialogProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  profileHref: string
  showCancel?: boolean
}

export function AccountDetailsDialog({
  open,
  onOpenChange,
  profileHref,
  showCancel = true,
}: AccountDetailsDialogProps) {
  const handleClose = useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>You must add your account details first to recieve payment.</DialogTitle>
          <DialogDescription>click to add your detials now.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {showCancel && (
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
          <Link href={profileHref}>
            <Button type="button">Profile</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


