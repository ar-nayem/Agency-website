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

    // Developer (OWNER) and ADMIN can message anyone.
    // AGENT can message any ADMIN freely, but can only message the developer/owner
    // if that owner has messaged them first.
    if (user.role !== 'AGENT') {
      const agents = await prisma.user.findMany({
        where: { id: { not: user.id }, role: { not: 'DELETED' } },
        select: { id: true, name: true, email: true, role: true, isActive: true },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json(agents)
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true, isActive: true },
      orderBy: { name: 'asc' },
    })

    const owners = await prisma.user.findMany({
      where: { role: 'OWNER' },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    const reachableOwners = []
    for (const owner of owners) {
      const ownerMessagedMe = await prisma.message.findFirst({
        where: { senderId: owner.id, receiverId: user.id },
        select: { id: true },
      })
      if (ownerMessagedMe) reachableOwners.push(owner)
    }

    const combined = [...admins, ...reachableOwners].sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json(combined)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}
