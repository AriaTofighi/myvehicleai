import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Ensure Supabase auth cookies refresh on navigation
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  await supabase.auth.getSession()
  return response
}

export const config = {
  matcher: [
    // Refresh session on all app routes, API routes excluded by default
    "/((?!_next|.*\..*|api).*)",
  ],
}

