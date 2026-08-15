export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { orgWhere, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reqs = await prisma.fieldRequirement.findMany({
      where: { active: true, ...orgWhere(user) },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(reqs)
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

    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })

    const body = await req.json()
    const reqField = await prisma.fieldRequirement.create({
      data: {
        key: body.key,
        label: body.label,
        section: body.section,
        isRequired: body.isRequired ?? true,
        sortOrder: body.sortOrder || 0,
        organizationId: orgId,
      },
    })
    return NextResponse.json(reqField, { status: 201 })
  } catch (error) {
    console.error('Field req POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
