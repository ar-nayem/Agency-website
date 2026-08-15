export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER' || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { inviteCode: true } })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    return NextResponse.json({ code: org.inviteCode })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch invite link' }, { status: 500 })
  }
}

// Regenerating invalidates the previous link immediately — anyone holding
// the old one can no longer sign up with it.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER' || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { inviteCode: randomUUID() },
      select: { inviteCode: true },
    })

    return NextResponse.json({ code: org.inviteCode })
  } catch {
    return NextResponse.json({ error: 'Failed to regenerate invite link' }, { status: 500 })
  }
}
