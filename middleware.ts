import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/services',
  '/contact',
  '/login',
  '/signup',
  '/reset-password',
]

export const config = {
  matcher: ['/portal/:path*', '/api/admin/:path*', '/api/user/profile'],
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (PUBLIC_PATHS.includes(path)) return NextResponse.next()

  if (!req.cookies.get('d_session')?.value) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}
