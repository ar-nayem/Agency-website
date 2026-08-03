export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

// Resolves a @mention like "GL-00004" back to a student id for the message
// renderer. Agents get a 404 for serials they don't own — same response as
// "doesn't exist" so ownership isn't leaked.
export async function GET(req: NextRequest, { params }: { params: Promise<{ serial: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serial } = await params
    const student = await prisma.student.findUnique({
      where: { serialNumber: serial },
      select: { id: true, fullName: true, serialNumber: true, status: true, agentId: true },
    })

    if (!student || (!isAdminRole(user.role) && student.agentId !== user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch {
    return NextResponse.json({ error: 'Failed to resolve student' }, { status: 500 })
  }
}
