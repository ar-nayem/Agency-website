export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, orgHasFeature } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'document_requirements'))) {
      return NextResponse.json({ error: 'Document Requirements is not included in your plan' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.documentRequirement.findUnique({ where: { id } })
    if (!existing || !isSameOrg(user, existing)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await req.json()
    const updated = await prisma.documentRequirement.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'document_requirements'))) {
      return NextResponse.json({ error: 'Document Requirements is not included in your plan' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.documentRequirement.findUnique({ where: { id } })
    if (!existing || !isSameOrg(user, existing)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.documentRequirement.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
