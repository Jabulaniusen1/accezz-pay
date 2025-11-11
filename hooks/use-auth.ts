"use client"

import { useEffect, useState } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase"

interface User {
  id: string
  email: string
  name?: string
  orgName?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser) {
        // TODO: Fetch user profile from database
        setUser({
          id: authUser.id,
          email: authUser.email || "",
        })
      }
      setLoading(false)
    }

    checkUser()
  }, [supabase])

  return { user, loading }
}
