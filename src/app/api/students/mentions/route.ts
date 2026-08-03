export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

// Lightweight lookup for @mention autocomplete in messages.
// Agents only see their own students; admins/owner see everyone.
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const q = new URL(req.url).searchParams.get('q')?.trim() || ''

    const where: any = isAdminRole(user.role) ? {} : { agentId: user.id }
    if (q) {
      where.OR = [
        { serialNumber: { contains: q } },
        { fullName: { contains: q } },
      ]
    }

    const students = await prisma.student.findMany({
      where,
      select: { id: true, fullName: true, serialNumber: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })

    return NextResponse.json(students)
  } catch {
    return NextResponse.json({ error: 'Failed to search students' }, { status: 500 })
  }
}
