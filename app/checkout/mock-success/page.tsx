import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type MockSuccessPageProps = {
  searchParams: Promise<{
    reference?: string
    order_id?: string
  }>
}

export default async function MockSuccessPage({ searchParams }: MockSuccessPageProps) {
  const params = await searchParams
  const reference = params.reference ?? "mock_reference"
  const orderId = params.order_id ?? "mock_order"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center p-6">
      <Card className="max-w-lg w-full border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-foreground">Payment simulated successfully</CardTitle>
          <CardDescription>This environment is running without a Paystack secret key, so we mocked a successful checkout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-foreground/80">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium text-foreground">Reference</p>
            <p className="text-foreground/70">{reference}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium text-foreground">Order ID</p>
            <p className="text-foreground/70">{orderId}</p>
          </div>
          <p>
            Tickets are being issued in the background. Check your dashboard and email inbox to review the mock purchase summary.
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

