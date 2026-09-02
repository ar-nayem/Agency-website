export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole, orgHasFeature } from '@/src/lib/session'
import { orgWhere, requireOrgId } from '@/src/lib/orgScope'
import { computeOfferStatus } from '@/src/lib/chatbot'
import { NextRequest, NextResponse } from 'next/server'

// GET is intentionally public (no session required) — the landing/login page
// widget and the portal chatbot both need to read live offers without auth.
// ?all=true additionally returns paused/expired offers, but only to a logged
// in ADMIN/OWNER managing the list — never leaked to the public response.
// The fully-public path below has no org signal at all on this single-domain
// deployment (no per-org subdomain yet) — a known, accepted gap: once a
// second org's offers exist, this endpoint mixes both orgs' public promos.
// Not fixable without a domain/slug-based tenant resolution, which is out of
// scope here. The authenticated includeAll path IS scoped, below.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const wantsAll = searchParams.get('all') === 'true'

    let includeAll = false
    let where: any = { isActive: true }
    if (wantsAll) {
      const user = await getEffectiveUser(req)
      includeAll = !!user && isAdminRole(user.role)
      if (includeAll && user) where = orgWhere(user)
    }

    const offers = await prisma.offer.findMany({
      where,
      orderBy: { startDate: 'asc' },
      select: {
        id: true, title: true, description: true, imageUrl: true,
        startDate: true, endDate: true, isActive: true, createdAt: true, updatedAt: true,
        createdBy: { select: { name: true } },
      },
    })

    const withStatus = offers
      .map(o => ({ ...o, status: computeOfferStatus(o) }))
      .filter(o => includeAll || o.status === 'RUNNING' || o.status === 'UPCOMING')

    return NextResponse.json(withStatus)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'offers'))) {
      return NextResponse.json({ error: 'Offers is not included in your plan' }, { status: 403 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })

    const body = await req.json()
    const { title, description, imageUrl, startDate, endDate, isActive } = body

    if (!title || !description || !startDate) {
      return NextResponse.json({ error: 'title, description and startDate are required' }, { status: 400 })
    }

    const offer = await prisma.offer.create({
      data: {
        title,
        description,
        imageUrl: imageUrl || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive ?? true,
        createdById: user.id,
        organizationId: orgId,
      },
    })

    return NextResponse.json(offer, { status: 201 })
  } catch (error) {
    console.error('Offers POST error:', error)
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 })
  }
}
