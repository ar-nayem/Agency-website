export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { buildStudentWorkbook } from '@/src/lib/studentExcel'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        educationHistory: true,
        workExperience: true,
        familyMembers: true,
        financialSponsors: true,
      },
    })

    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    if (!isAdminRole(user.role) && student.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const wb = buildStudentWorkbook(student)
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `${student.serialNumber || student.id.slice(0, 8)}-${student.fullName}.xlsx`.replace(/[\\/:*?"<>|]/g, '-')

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Student export error:', error)
    return NextResponse.json({ error: 'Failed to export student' }, { status: 500 })
  }
}
