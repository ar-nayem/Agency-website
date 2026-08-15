export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { isSameOrg, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

// Every real caller of this route is inside /dashboard (sidebar branding,
// receipt styling) — always an authenticated user in practice, even though
// this handler previously didn't enforce it. Now requiring a session lets
// ?owner=true resolve "my own org's profile" instead of a global OWNER search.
export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const owner = searchParams.get('owner')

    if (owner === 'true') {
      if (!user.organizationId) return NextResponse.json(null)
      const profile = await prisma.organizationProfile.findFirst({
        where: { organizationId: user.organizationId },
      })
      if (profile) return NextResponse.json(profile)
      // Brand-new org with no branding set yet — fall back to its own real
      // name instead of the client's hardcoded placeholder default, so a
      // freshly provisioned account never shows another org's name.
      const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } })
      return NextResponse.json(org ? { name: org.name, logo: null } : null)
    }

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // Only ever return a profile belonging to the caller's own org.
    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } })
    if (!targetUser || !isSameOrg(user, targetUser)) return NextResponse.json(null)

    const org = await prisma.organizationProfile.findUnique({
      where: { userId },
    })

    return NextResponse.json(org)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })

    const body = await req.json()
    const { name, logo, email, phone, wechat, address, website, description, welcomeMessage } = body

    const org = await prisma.organizationProfile.upsert({
      where: { userId: user.id },
      update: { name, logo, email, phone, wechat, address, website, description, welcomeMessage, organizationId: orgId },
      create: {
        name: name || user.name,
        logo, email, phone, wechat, address, website, description, welcomeMessage,
        userId: user.id,
        organizationId: orgId,
      },
    })

    return NextResponse.json(org)
  } catch (error) {
    console.error('Organization PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}
