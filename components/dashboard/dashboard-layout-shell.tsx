"use client"

import type React from "react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useFormStatus } from "react-dom"
import { usePathname, useSearchParams } from "next/navigation"
import { FiGrid, FiCalendar, FiLogOut, FiMenu, FiChevronRight, FiBell, FiUser } from "react-icons/fi"
import { Palette, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { OrganizerBranding } from "@/types/database"
import { logoutAction } from "@/app/dashboard/actions"

type DashboardLayoutShellProps = {
  children: React.ReactNode
  organizerName?: string
  contactName?: string
  branding?: OrganizerBranding
}

function lightenColor(hexColor: string, intensity = 0.8) {
  const sanitized = hexColor.replace("#", "")
  const bigint = parseInt(sanitized.length === 3 ? sanitized.repeat(2) : sanitized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  const mix = (channel: number) => Math.round(channel + intensity * (255 - channel))
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

export function DashboardLayoutShell({ children, organizerName, contactName, branding }: DashboardLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get("tab") === "profile" ? "profile" : "branding"

  const styleVariables = useMemo(() => {
    const primary = branding?.primaryColor ?? "#6B21A8"
    return {
      "--brand-primary": primary,
      "--brand-primary-soft": lightenColor(primary, 0.7),
      "--brand-secondary": branding?.secondaryColor ?? "#EEF2FF",
      "--brand-font": branding?.fontFamily ?? "Inter, sans-serif",
    } as React.CSSProperties
  }, [branding])

  const navigationItems = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: <FiGrid className="h-4 w-4" />,
      isActive: pathname === "/dashboard",
    },
    {
      href: "/dashboard/settings?tab=branding",
      label: "Branding",
      icon: <Palette className="h-4 w-4" />,
      isActive: pathname === "/dashboard/settings" && activeTab !== "profile",
    },
    {
      href: "/dashboard/settings?tab=profile",
      label: "Profile",
      icon: <FiUser className="h-4 w-4" />,
      isActive: pathname === "/dashboard/settings" && activeTab === "profile",
    },
    {
      href: "/dashboard/events",
      label: "Events",
      icon: <FiCalendar className="h-4 w-4" />,
      isActive: pathname === "/dashboard/events" || pathname.startsWith("/dashboard/events/"),
    },
    {
      href: "/dashboard/wallet",
      label: "Wallet",
      icon: <Wallet className="h-4 w-4" />,
      isActive: pathname === "/dashboard/wallet" || pathname.startsWith("/dashboard/wallet/"),
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f7ff]" style={styleVariables}>
      <aside
        className={`relative hidden h-screen flex-col transition-[width] duration-300 lg:flex ${
          sidebarOpen ? "w-72" : "w-24"
        }`}
      >
        <div
          className="absolute inset-0 rounded-r-[32px] shadow-lg shadow-[var(--brand-primary-soft)]/30"
          style={{
            background: "linear-gradient(165deg, var(--brand-primary) 0%, var(--brand-primary-soft) 100%)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col px-5 pb-6 pt-8 text-white">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <FiChevronRight className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white">
              <span className="text-xl font-semibold uppercase">{(organizerName ?? "A").slice(0, 1)}</span>
            </div>
            {sidebarOpen && (
              <div>
                <p className="text-sm text-white/70">Organizer</p>
                <p className="text-lg font-semibold">{organizerName ?? "AccezzPay"}</p>
              </div>
            )}
          </div>
          <nav className="flex flex-1 flex-col gap-2" style={{ fontFamily: "var(--brand-font)" }}>
            {navigationItems.map((item) => {
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      item.isActive
                        ? "bg-white text-[var(--brand-primary)] shadow-lg"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-base transition ${
                        item.isActive
                          ? "bg-[var(--brand-secondary)] text-[var(--brand-primary)]"
                          : "bg-white/15 text-white"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {sidebarOpen && <span>{item.label}</span>}
                  </div>
                </Link>
              )
            })}
          </nav>
          <div className="mt-6 rounded-3xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Need more?</p>
            <p className="mt-2 text-sm font-medium text-white">Upgrade your ticketing experience with AccezzPay.</p>
            <Button className="mt-4 w-full rounded-full bg-white text-[var(--brand-primary)] hover:bg-white/90">
              Explore
            </Button>
          </div>
          <form action={logoutAction} className="mt-6 w-full">
            <LogoutButton sidebarOpen={sidebarOpen} />
          </form>
        </div>
      </aside>

      <div className="flex h-screen w-full flex-col overflow-hidden">
        <header
          className="flex flex-col gap-4 px-6 pb-6 pt-8 lg:px-10"
          style={{ fontFamily: "var(--brand-font)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--brand-primary)]/80">Organizer Dashboard</p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Welcome back{contactName ? ` ${contactName}` : ""}!
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-[var(--brand-primary)]">
                <FiBell className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-3 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-secondary)] text-[var(--brand-primary)]">
                  <span className="text-sm font-medium">{(organizerName ?? "A").slice(0, 1)}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">{organizerName ?? "AccezzPay"}</p>
                  <p className="text-xs text-slate-500 leading-tight">Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 pb-10 lg:px-10" style={{ fontFamily: "var(--brand-font)" }}>
          <div className="min-h-full rounded-[40px] bg-white/90 p-6 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-100">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function LogoutButton({ sidebarOpen }: { sidebarOpen: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="w-full justify-center gap-2 rounded-2xl bg-white/15 text-white hover:bg-white/25 disabled:opacity-70"
    >
      <FiLogOut className="h-4 w-4" />
      {sidebarOpen && <span>{pending ? "Logging out..." : "Logout"}</span>}
    </Button>
  )
}