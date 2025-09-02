"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"

type NavItem = {
  href: string
  label: string
}

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/visualizer", label: "Visualizer" },
  { href: "/presets", label: "Presets" },
  { href: "/gallery", label: "Gallery" },
  { href: "/docs", label: "Docs" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUserEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => {
      mounted = false
      sub.subscription?.unsubscribe()
    }
  }, [supabase])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block rounded-md bg-foreground text-background px-2 py-1 text-xs tracking-wide">MVA</span>
          <span className="hidden sm:inline">MyVehicleAI</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex">
          {navItems.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/visualizer">Open Visualizer</Link>
          </Button>
          {userEmail ? (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground">{userEmail}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut()
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              {showEmailForm ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setAuthError(null)
                    setEmailSent(false)
                    try {
                      const { error } = await supabase.auth.signInWithOtp({
                        email,
                        options: { emailRedirectTo: `${location.origin}/auth/callback` },
                      })
                      if (error) throw error
                      setEmailSent(true)
                    } catch (err: any) {
                      setAuthError(err?.message || "Failed to send sign-in link")
                    }
                  }}
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-48 rounded-md border bg-background px-3 py-1.5 text-sm"
                  />
                  <Button size="sm" type="submit">Send link</Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setShowEmailForm(false)}>
                    Cancel
                  </Button>
                  {emailSent ? (
                    <span className="ml-2 text-xs text-muted-foreground">Check your email</span>
                  ) : null}
                  {authError ? (
                    <span className="ml-2 text-xs text-destructive">{authError}</span>
                  ) : null}
                </form>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowEmailForm(true)}>
                  Sign in
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
