"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-20">
          <h1 className="text-4xl font-bold text-primary">AccezzPay</h1>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-accent text-primary-foreground">Sign Up</Button>
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-5xl font-bold mb-6 text-balance">White-Labeled Checkout for Every Experience</h2>
            <p className="text-xl text-foreground/80 mb-8 leading-relaxed">
              Create customizable checkout pages for events, cinemas, sports, and experiences. Let your customers buy
              tickets with your branding, your colors, your way.
            </p>
            <div className="flex gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-primary hover:bg-accent text-primary-foreground">
                  Get Started Free
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
            <div className="bg-muted rounded-lg p-12 flex items-center justify-center min-h-96">
              <p className="text-muted-foreground text-center">Checkout Preview</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            { title: "Custom Branding", desc: "Add your logo, colors, and fonts" },
            { title: "Easy Event Setup", desc: "Create events and manage tickets" },
            { title: "Payment Processing", desc: "Secure Paystack integration" },
          ].map((feature, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-foreground/70">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-primary text-primary-foreground rounded-lg p-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to launch your checkout?</h3>
          <p className="mb-6 text-lg opacity-90">Join organizers who are simplifying ticket sales with AccezzPay</p>
          <Link href="/signup">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-secondary">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
