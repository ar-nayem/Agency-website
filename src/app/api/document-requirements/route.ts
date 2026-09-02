export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, canManageOfficialDocs, orgHasFeature } from '@/src/lib/session'
import { orgWhere, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reqs = await prisma.documentRequirement.findMany({
      where: { active: true, ...orgWhere(user) },
      orderBy: { sortOrder: 'asc' },
    })

    // Resolve once per request rather than per category — the underlying
    // permission can't change between rows of the same response.
    const officialAccess = reqs.some(r => r.isOfficial) ? await canManageOfficialDocs(user) : true
    const withAccess = reqs.map(r => ({ ...r, locked: r.isOfficial && !officialAccess }))
    return NextResponse.json(withAccess)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch requirements' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'document_requirements'))) {
      return NextResponse.json({ error: 'Document Requirements is not included in your plan' }, { status: 403 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })

    const body = await req.json()
    const reqDoc = await prisma.documentRequirement.create({
      data: {
        key: body.key,
        label: body.label,
        description: body.description,
        accept: body.accept || '.pdf,image/*',
        type: body.type || 'PDF',
        maxSize: body.maxSize,
        isRequired: body.isRequired || false,
        isOfficial: body.isOfficial || false,
        sortOrder: body.sortOrder || 0,
        organizationId: orgId,
      },
    })
    return NextResponse.json(reqDoc, { status: 201 })
  } catch (error) {
    console.error('Doc req POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
