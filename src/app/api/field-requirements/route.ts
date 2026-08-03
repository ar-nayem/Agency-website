export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const reqs = await prisma.fieldRequirement.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(reqs)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch requirements' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const reqField = await prisma.fieldRequirement.create({
      data: {
        key: body.key,
        label: body.label,
        section: body.section,
        isRequired: body.isRequired ?? true,
        sortOrder: body.sortOrder || 0,
      },
    })
    return NextResponse.json(reqField, { status: 201 })
  } catch (error) {
    console.error('Field req POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
