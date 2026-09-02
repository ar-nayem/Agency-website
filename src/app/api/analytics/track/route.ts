export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const path = typeof body.path === 'string' ? body.path.slice(0, 300) : '/'
    const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : null

    const user = await getEffectiveUser(req)

    await prisma.visitorLog.create({
      data: {
        userId: user?.id || null,
        userName: user?.name || null,
        userEmail: user?.email || null,
        userRole: user?.role || null,
        path,
        referrer,
        userAgent: req.headers.get('user-agent')?.slice(0, 500) || null,
        ip: getClientIp(req),
        // Stamped at write time so each org's analytics can be filtered
        // without joining through User (whose org could change later, which
        // would silently rewrite history). Anonymous traffic stays null.
        organizationId: user?.organizationId || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Never let tracking failures surface to the user.
    console.error('POST /api/analytics/track error:', error)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
