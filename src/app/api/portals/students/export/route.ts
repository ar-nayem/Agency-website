export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, canAccessPortals } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { categorizeAdmitStatus, CATEGORY_LABELS } from '@/src/lib/portalStatus'

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

    const students = await prisma.portalStudentSnapshot.findMany({
      where,
      include: {
        portal: { select: { name: true } },
        matchedStudent: { select: { fullName: true, status: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    let filtered = category ? students.filter((s) => categorizeAdmitStatus(s.admitStatus, s.portalId) === category) : students
    if (matched === '1') filtered = filtered.filter((s) => !!s.matchedStudent)
    if (matched === '0') filtered = filtered.filter((s) => !s.matchedStudent)

    const data = filtered.map((s) => ({
      'University': s.portal.name,
      'Name': s.passportName || '',
      'Passport No.': s.passportNo || '',
      'Program': s.program || '',
      'Status': CATEGORY_LABELS[categorizeAdmitStatus(s.admitStatus, s.portalId)],
      'Raw Admit Status Code': s.admitStatus || '',
      'Last Seen': s.lastSeenAt.toISOString(),
      'Matched Local Student': s.matchedStudent?.fullName || '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="university-students-${Date.now()}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('GET /api/portals/students/export error:', error)
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 })
  }
}
