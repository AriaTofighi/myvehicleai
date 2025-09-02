"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState("Signing you in…")

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        // Try exchanging any code/tokens present in the URL for a session
        await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {})
        const { data } = await supabase.auth.getUser()
        if (mounted) setStatus(data.user ? "Signed in. Redirecting…" : "No session found")
      } catch (e) {
        if (mounted) setStatus("Authentication failed")
      } finally {
        setTimeout(() => router.replace("/"), 600)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [router, supabase])

  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-sm text-muted-foreground">{status}</p>
    </div>
  )
}

