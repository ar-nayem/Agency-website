import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const secret = process.env.NEXTAUTH_SECRET || 'glorie-secret-key-2024-change-in-production'

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret })
  const { pathname } = request.nextUrl

  // Allow public routes
  if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname === '/api/analytics/track') {
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Admin dashboard - ADMIN and OWNER
    if (pathname.startsWith('/dashboard/admin') && token.role !== 'ADMIN' && token.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // OWNER-only routes: agents management, document requirements, field requirements
    const ownerOnlyPaths = ['/dashboard/agents', '/dashboard/document-requirements', '/dashboard/field-requirements', '/dashboard/portals', '/dashboard/analytics']
    // Only mutating this data is OWNER-only — every agent needs to read requirement
    // lists and the user directory (e.g. to know what to upload, or filter by agent).
    // The routes themselves enforce the correct read permissions per role.
    const ownerOnlyApiPaths = ['/api/document-requirements', '/api/field-requirements', '/api/users']

    if (ownerOnlyPaths.some(p => pathname.startsWith(p)) && token.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (
      ownerOnlyApiPaths.some(p => pathname.startsWith(p)) &&
      request.method !== 'GET' &&
      token.role !== 'OWNER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads/).*)']
}
