export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // OWNER and ADMIN can message anyone; AGENT can only message ADMIN/OWNER.
    const where: any = { id: { not: user.id } }
    if (user.role === 'AGENT') {
      where.role = { in: ['ADMIN', 'OWNER'] }
    }

    const agents = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(agents)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}
