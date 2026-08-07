export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { categorizeAdmitStatus } from '@/src/lib/portalStatus'

const CATEGORY_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
  UNKNOWN: 'Unknown',
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const portalId = searchParams.get('portalId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')

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
        portal: { select: { name: true } },
        matchedStudent: { select: { fullName: true, status: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    })

    const filtered = category ? students.filter((s) => categorizeAdmitStatus(s.admitStatus) === category) : students

    const data = filtered.map((s) => ({
      'University': s.portal.name,
      'Name': s.passportName || '',
      'Passport No.': s.passportNo || '',
      'Program': s.program || '',
      'Status': CATEGORY_LABELS[categorizeAdmitStatus(s.admitStatus)],
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
