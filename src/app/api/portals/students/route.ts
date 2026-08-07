export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const portalId = searchParams.get('portalId')
    const search = searchParams.get('search')

    const where: any = {}
    if (portalId) where.portalId = portalId
    if (search) {
      where.OR = [
        { passportName: { contains: search } },
        { passportNo: { contains: search } },
      ]
    }

    const students = await prisma.portalStudentSnapshot.findMany({
      where,
      include: {
        portal: { select: { id: true, name: true } },
        matchedStudent: { select: { id: true, fullName: true, status: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('GET /api/portals/students error:', error)
    return NextResponse.json({ error: 'Failed to fetch portal students' }, { status: 500 })
  }
}
