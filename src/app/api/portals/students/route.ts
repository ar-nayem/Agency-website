export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, canAccessPortals } from '@/src/lib/session'
import { categorizeAdmitStatus } from '@/src/lib/portalStatus'
import { NextRequest, NextResponse } from 'next/server'

// Query params are all optional filters applied at the database level (or,
// for category — a JS-side derived value with no matching column — on the
// already-narrowed result set). Nothing here fetches unfiltered: the client
// only calls this once the user explicitly clicks Search, and only with the
// filters they actually picked, so a request with zero params really is
// "give me everyone" by deliberate one-off choice, not a background poll.
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !(await canAccessPortals(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const portalId = searchParams.get('portalId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const matched = searchParams.get('matched')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}
    if (portalId) where.portalId = portalId
    if (search) {
      where.OR = [
        { passportName: { contains: search } },
        { passportNo: { contains: search } },
      ]
    }
    if (dateFrom || dateTo) {
      where.appliedAt = {}
      if (dateFrom) where.appliedAt.gte = new Date(`${dateFrom}T00:00:00`)
      if (dateTo) where.appliedAt.lte = new Date(`${dateTo}T23:59:59.999`)
    }
    if (matched === '1') where.matchedStudentId = { not: null }
    if (matched === '0') where.matchedStudentId = null

    let students = await prisma.portalStudentSnapshot.findMany({
      where,
      include: {
        portal: { select: { id: true, name: true } },
        matchedStudent: { select: { id: true, fullName: true, status: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    if (category) {
      students = students.filter((s) => categorizeAdmitStatus(s.admitStatus, s.portalId) === category)
    }

    return NextResponse.json(students)
  } catch (error) {
    console.error('GET /api/portals/students error:', error)
    return NextResponse.json({ error: 'Failed to fetch portal students' }, { status: 500 })
  }
}
