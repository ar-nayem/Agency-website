export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, getOrgEnabledFeatures } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, wechat: true, avatar: true, bio: true, timezone: true,
        canViewPortals: true,
        createdAt: true,
      },
    })

    const organization = await prisma.organizationProfile.findUnique({
      where: { userId: user.id },
    })

    // null = unrestricted (no package on this org) — the dashboard sidebar
    // shows every nav item in that case instead of filtering by this list.
    const enabledFeatures = await getOrgEnabledFeatures(user.organizationId)

    return NextResponse.json({ profile, organization, enabledFeatures })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, phone, wechat, avatar, bio } = body
    const data: Record<string, unknown> = { name, phone, wechat, avatar, bio }
    if ('timezone' in body) data.timezone = body.timezone || null

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, wechat: true, avatar: true, bio: true, timezone: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
