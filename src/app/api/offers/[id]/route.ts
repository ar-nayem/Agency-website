export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data: any = {}
    if (typeof body.title === 'string') data.title = body.title
    if (typeof body.description === 'string') data.description = body.description
    if ('imageUrl' in body) data.imageUrl = body.imageUrl || null
    if (body.startDate) data.startDate = new Date(body.startDate)
    if ('endDate' in body) data.endDate = body.endDate ? new Date(body.endDate) : null
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive

    const updated = await prisma.offer.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.offer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 })
  }
}
