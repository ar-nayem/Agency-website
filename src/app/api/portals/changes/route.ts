export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const portalId = searchParams.get('portalId')

    const where: any = {}
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
