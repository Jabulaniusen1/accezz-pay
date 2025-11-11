"use client"

import type React from "react"
import { useMemo, useState } from "react"
import Link from "next/link"
import { FiGrid, FiCalendar, FiLogOut, FiMenu, FiChevronRight } from "react-icons/fi"

import { Button } from "@/components/ui/button"
import type { OrganizerBranding } from "@/types/database"
import { Palette, Wallet } from "lucide-react"

type DashboardLayoutShellProps = {
  children: React.ReactNode
  organizerName?: string
  branding?: OrganizerBranding
}

export function DashboardLayoutShell({ children, organizerName, branding }: DashboardLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const styleVariables = useMemo(() => {
    return {
      "--brand-primary": branding?.primaryColor ?? "#6B21A8",
      "--brand-secondary": branding?.secondaryColor ?? "#F3E8FF",
      "--brand-font": branding?.fontFamily ?? "Inter, sans-serif",
    } as React.CSSProperties
  }, [branding])

  const navigationItems = [
    { href: "/dashboard", label: "Overview", icon: <FiGrid className="h-4 w-4" /> },
    { href: "/dashboard/settings", label: "Branding", icon: <Palette className="h-4 w-4" /> },
    { href: "/dashboard/events", label: "Events", icon: <FiCalendar className="h-4 w-4" /> },
    { href: "/dashboard/wallet", label: "Wallet", icon: <Wallet className="h-4 w-4" /> },
  ]

  return (
    <div className="flex h-screen bg-background" style={styleVariables}>
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} border-r border-border transition-all duration-300 flex flex-col bg-card`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold" style={{ color: "var(--brand-primary)", fontFamily: "var(--brand-font)" }}>
            {organizerName ?? "AccezzPay"}
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:bg-primary/10 hover:text-primary"
                style={{ fontFamily: "var(--brand-font)" }}
              >
                <span className="text-xl text-primary">{item.icon}</span>
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </Button>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-foreground hover:bg-primary/10 hover:text-primary"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            <FiLogOut className="h-4 w-4" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border p-4 flex justify-between items-center">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="rounded-md border border-transparent p-2 text-foreground transition-colors hover:border-primary/30 hover:text-primary"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <FiMenu className="h-5 w-5" /> : <FiChevronRight className="h-5 w-5" />}
          </button>
          <div className="text-right" style={{ fontFamily: "var(--brand-font)" }}>
            <p className="text-sm text-foreground/70">Organizer Dashboard</p>
            <p className="font-semibold text-foreground">Welcome back!</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ fontFamily: "var(--brand-font)" }}>
          {children}
        </main>
      </div>
    </div>
  )
}

