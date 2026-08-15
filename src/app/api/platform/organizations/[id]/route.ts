export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

// Suspend/reactivate (or rename / adjust plan) an organization. Suspension
// takes effect immediately for that org's users via getEffectiveUser's
// per-request status check — no separate propagation step needed.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.organization.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const body = await req.json()
    const data: any = {}

    if (body.status !== undefined) {
      if (body.status !== 'ACTIVE' && body.status !== 'SUSPENDED') {
        return NextResponse.json({ error: 'status must be ACTIVE or SUSPENDED' }, { status: 400 })
      }
      data.status = body.status
      data.suspendedAt = body.status === 'SUSPENDED' ? new Date() : null
      data.suspendedReason = body.status === 'SUSPENDED' ? (body.suspendedReason || null) : null
    }
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.planTier === 'string') data.planTier = body.planTier
    if ('studentLimit' in body) data.studentLimit = body.studentLimit === null ? null : Number(body.studentLimit)

    const org = await prisma.organization.update({ where: { id }, data })

    await logActivity(user.id, 'ORGANIZATION_UPDATED', `${org.name}: ${JSON.stringify(data)}`)

    return NextResponse.json(org)
  } catch (error) {
    console.error('PATCH /api/platform/organizations/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}
