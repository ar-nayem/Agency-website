export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

function isOwner(role: string | undefined) {
  return role === 'OWNER'
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const settings = await prisma.scanSettings.upsert({
      where: { id: 'global' },
      create: { id: 'global' },
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
    const user = await getSessionUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

    const settings = await prisma.scanSettings.upsert({
      where: { id: 'global' },
      create: { id: 'global', ...data },
      update: data,
    })
    return NextResponse.json(settings)
  } catch (error) {
    console.error('PUT /api/portals/settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
