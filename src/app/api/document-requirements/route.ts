export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const reqs = await prisma.documentRequirement.findMany({
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
    const reqDoc = await prisma.documentRequirement.create({
      data: {
        key: body.key,
        label: body.label,
        description: body.description,
        accept: body.accept || '.pdf,image/*',
        type: body.type || 'PDF',
        maxSize: body.maxSize,
        isRequired: body.isRequired || false,
        sortOrder: body.sortOrder || 0,
      },
    })
    return NextResponse.json(reqDoc, { status: 201 })
  } catch (error) {
    console.error('Doc req POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
