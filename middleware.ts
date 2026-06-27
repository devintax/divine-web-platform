import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-server'
import type { UserRole } from '@/lib/rbac/roles'
import { hasMinLevel } from '@/lib/rbac/roles'

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/services',
  '/contact',
  '/login',
  '/signup',
  '/reset-password',
]

const ROUTE_GUARDS: Array<{ pattern: RegExp; minRole: UserRole }> = [
  { pattern: /^\/portal\/admin\/settings/, minRole: 'super_admin' },
  { pattern: /^\/portal\/admin\/roles/, minRole: 'manager' },
  { pattern: /^\/portal\/admin\/health/, minRole: 'manager' },
  { pattern: /^\/portal\/admin\/tax/, minRole: 'tax_intern' },
  { pattern: /^\/portal\/admin\/formation/, minRole: 'specialist' },
  { pattern: /^\/portal\/admin\/insurance/, minRole: 'broker' },
  { pattern: /^\/portal\/admin\/notary/, minRole: 'notary' },
  { pattern: /^\/portal\/admin\/books/, minRole: 'accountant' },
  { pattern: /^\/portal\/admin\//, minRole: 'manager' },
  { pattern: /^\/api\/admin\//, minRole: 'manager' },
  { pattern: /^\/portal\//, minRole: 'client' },
]

export const config = {
  matcher: ['/portal/:path*', '/api/admin/:path*', '/api/user/profile'],
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (PUBLIC_PATHS.includes(path)) return NextResponse.next()

  const session = await getAuthSession()
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const guard = ROUTE_GUARDS.find((entry) => entry.pattern.test(path))
  if (guard && !hasMinLevel(session.role as UserRole, guard.minRole)) {
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  return NextResponse.next()
}
