export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { orgWhere } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Developer (OWNER) and ADMIN can message anyone in their own org.
    // AGENT can message any ADMIN in their org freely, but can only message
    // their own org's owner if that owner has messaged them first.
    if (user.role !== 'AGENT') {
      const agents = await prisma.user.findMany({
        where: { id: { not: user.id }, role: { not: 'DELETED' }, ...orgWhere(user) },
        select: { id: true, name: true, email: true, role: true, isActive: true },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json(agents)
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', ...orgWhere(user) },
      select: { id: true, name: true, email: true, role: true, isActive: true },
      orderBy: { name: 'asc' },
    })

    const owners = await prisma.user.findMany({
      where: { role: 'OWNER', ...orgWhere(user) },
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
