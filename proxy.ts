import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const protectedRoutes = [
  "/dashboard",
  "/employees",
  "/suppliers",
  "/attendance",
  "/reports",
  "/settings",
  "/kiosk",
]

const authRoutes = ["/sign-in", "/sign-up"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (isProtected && !session) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/employees/:path*",
    "/suppliers/:path*",
    "/attendance/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/kiosk/:path*",
    "/sign-in",
    "/sign-up",
  ],
}
