export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, canAccessPortals } from '@/src/lib/session'
import { orgWhereVia } from '@/src/lib/orgScope'
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
    const user = await getEffectiveUser(req)
    if (!user || !(await canAccessPortals(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const portalId = searchParams.get('portalId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const matched = searchParams.get('matched')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = { ...orgWhereVia(user, 'portal') }
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

    // Document coverage (admission letter / JW on file) only exists for
    // rows already matched to an internal Student — computed here as one
    // grouped query rather than per-row, since this list runs to hundreds
    // of rows at once.
    const matchedIds = Array.from(new Set(students.map(s => s.matchedStudentId).filter((id): id is string => !!id)))
    if (matchedIds.length > 0) {
      const counts = await prisma.universityDocument.groupBy({
        by: ['studentId', 'category'],
        where: { studentId: { in: matchedIds }, category: { in: ['ADMISSION_LETTER', 'JW'] } },
        _count: true,
      })
      const coverage = new Map<string, { admissionLetter: boolean; jw: boolean }>()
      for (const c of counts) {
        if (!c.studentId) continue
        const entry = coverage.get(c.studentId) || { admissionLetter: false, jw: false }
        if (c.category === 'ADMISSION_LETTER') entry.admissionLetter = true
        if (c.category === 'JW') entry.jw = true
        coverage.set(c.studentId, entry)
      }
      students = students.map(s => {
        if (!s.matchedStudent) return s
        return {
          ...s,
          matchedStudent: {
            ...s.matchedStudent,
            documentCoverage: coverage.get(s.matchedStudent.id) || { admissionLetter: false, jw: false },
          },
        }
      }) as typeof students
    }

    return NextResponse.json(students)
  } catch (error) {
    console.error('GET /api/portals/students error:', error)
    return NextResponse.json({ error: 'Failed to fetch portal students' }, { status: 500 })
  }
}
