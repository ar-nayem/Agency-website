export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

function isOwner(role: string | undefined) {
  return role === 'OWNER'
}

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })

    // One ScanSettings row per org — created on first access if missing,
    // since a brand-new org won't have one yet.
    const settings = await prisma.scanSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId },
      update: {},
    })
    return NextResponse.json(settings)
  } catch (error) {
    console.error('GET /api/portals/settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })

    const body = await req.json()
    const data: any = {}
    if (body.intervalHours !== undefined) {
      const hours = Number(body.intervalHours)
      if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
        return NextResponse.json({ error: 'intervalHours must be between 1 and 168' }, { status: 400 })
      }
      data.intervalHours = hours
    }
    if (body.enabled !== undefined) data.enabled = !!body.enabled
    if (body.staggerMinutes !== undefined) {
      const mins = Number(body.staggerMinutes)
      if (!Number.isFinite(mins) || mins < 1 || mins > 120) {
        return NextResponse.json({ error: 'staggerMinutes must be between 1 and 120' }, { status: 400 })
      }
      data.staggerMinutes = mins
    }

    const settings = await prisma.scanSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...data },
      update: data,
    })
    return NextResponse.json(settings)
  } catch (error) {
    console.error('PUT /api/portals/settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
