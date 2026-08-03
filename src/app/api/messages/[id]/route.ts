export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const message = await prisma.message.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json(message)
  } catch {
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}
