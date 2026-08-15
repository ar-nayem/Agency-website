export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, canAccessPortals } from '@/src/lib/session'
import { orgWhereVia } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !(await canAccessPortals(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const portalId = searchParams.get('portalId')

    // portalId narrows further when given, but the org filter always applies
    // — without it, an absent portalId used to return every org's change log.
    const where: any = { ...orgWhereVia(user, 'portal') }
    if (portalId) where.portalId = portalId

    const changes = await prisma.portalStatusChangeLog.findMany({
      where,
      include: { portal: { select: { id: true, name: true } } },
      orderBy: { detectedAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(changes)
  } catch (error) {
    console.error('GET /api/portals/changes error:', error)
    return NextResponse.json({ error: 'Failed to fetch change history' }, { status: 500 })
  }
}
