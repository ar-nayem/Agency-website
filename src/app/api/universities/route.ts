export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole } from '@/src/lib/session'
import { orgWhere, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const universities = await prisma.university.findMany({
      where: orgWhere(user),
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(universities)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch universities' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization context' }, { status: 400 })
    }

    const body = await req.json()
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const university = await prisma.university.create({
      data: {
        name: body.name,
        country: typeof body.country === 'string' ? body.country : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        createdById: user.id,
        organizationId: orgId,
      },
    })
    return NextResponse.json(university, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create university' }, { status: 500 })
  }
}
