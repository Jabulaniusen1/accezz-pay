import Link from "next/link"
import { FiBox, FiPlus, FiLock, FiCalendar, FiTrendingUp, FiShoppingBag } from "react-icons/fi"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { requireAuthenticatedUser } from "@/lib/auth"
import { listProductsByOrganizer } from "@/lib/data/products"
import { getOrganizerById } from "@/lib/data/organizers"
import { formatCurrencyFromCents, formatDate } from "@/lib/utils"
import { supabaseAdminClient } from "@/lib/supabase-admin"

async function getProductStats(productIds: string[]) {
  if (productIds.length === 0) {
    return {}
  }

  const ordersRes = await supabaseAdminClient
    .from("orders")
    .select("product_id, status, total_cents")
    .in("product_id", productIds)

  if (ordersRes.error) {
    console.error("getProductStats orders error", ordersRes.error)
    throw ordersRes.error
  }

  const stats: Record<
    string,
    {
      paidOrders: number
      revenueCents: number
    }
  > = {}

  for (const order of ordersRes.data ?? []) {
    if (!stats[order.product_id]) {
      stats[order.product_id] = { paidOrders: 0, revenueCents: 0 }
    }
    if (order.status === "paid") {
      stats[order.product_id].paidOrders += 1
      stats[order.product_id].revenueCents += Number(order.total_cents)
    }
  }

  return stats
}

export default async function EventsPage() {
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
  const products = organizerId ? await listProductsByOrganizer(organizerId) : []

  const productIds = products.map((product) => product.id)
  const stats = await getProductStats(productIds)

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground">{organizer ? `${organizer.name} Products` : "Products"}</h1>
          <p className="text-foreground/70">Create and manage the products powering your checkout experiences.</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="bg-primary hover:bg-accent text-primary-foreground gap-2">
            <FiPlus className="h-4 w-4" />
            New Product
          </Button>
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="grid gap-4">
          {products.map((product) => {
            const productStats = stats[product.id] ?? { paidOrders: 0, revenueCents: 0 }
            const currency = (organizer?.branding?.currency as string) ?? "NGN"
            return (
              <Link key={product.id} href={`/dashboard/events/${product.id}`}>
                <Card className="border-border hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">{product.title}</h3>
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[color:var(--brand-secondary,rgba(107,33,168,0.12))] text-[color:var(--brand-primary,#6B21A8)]">
                            Active
                        </span>
                      </div>
                        {product.start_at && (
                          <p className="text-foreground/70 mb-3 flex items-center gap-2">
                            <FiCalendar className="h-4 w-4" />
                            <span>
                              {formatDate(product.start_at)} {product.end_at ? `to ${formatDate(product.end_at)}` : ""}
                            </span>
                          </p>
                        )}
                      <div className="flex gap-6">
                        <div>
                            <p className="text-sm text-foreground/70">Paid Orders</p>
                            <p className="text-lg font-semibold text-foreground">{productStats.paidOrders}</p>
                        </div>
                        <div>
                          <p className="text-sm text-foreground/70">Revenue</p>
                            <p className="text-lg font-semibold text-primary flex items-center gap-2">
                              <FiTrendingUp className="h-4 w-4" />
                              {formatCurrencyFromCents(productStats.revenueCents, currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="gap-2">
                        <FiShoppingBag className="h-4 w-4" />
                        Manage
                      </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
            )
          })}
        </div>
      ) : (
        <Card className="border-border border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <FiBox className="mx-auto h-10 w-10 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">No products yet</h3>
            <p className="text-foreground/70">Add your first ticketed experience to start selling.</p>
            <Link href="/dashboard/events/new">
              <Button className="bg-primary hover:bg-accent text-primary-foreground gap-2">
                <FiPlus className="h-4 w-4" />
                Create Product
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
