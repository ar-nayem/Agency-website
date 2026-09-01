export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER, DELETED } from '@/src/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

// Every user who has ever signed up on any org across this deployment —
// the developer's own lead list. Platform-level, not org-scoped.
export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: { role: { not: DELETED } },
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        marketingOptOut: true, createdAt: true,
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('GET /api/platform/leads error:', error)
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}
