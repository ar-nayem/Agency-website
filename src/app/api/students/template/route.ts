export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { orgWhere } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { buildStudentWorkbook } from '@/src/lib/studentExcel'

export async function GET(req: NextRequest) {
  const user = await getEffectiveUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requirements = await prisma.documentRequirement.findMany({
    where: { active: true, isRequired: true, ...orgWhere(user) },
    orderBy: { sortOrder: 'asc' },
    select: { label: true },
  })

  const wb = buildStudentWorkbook(null, { blankRows: 8, requiredDocs: requirements.map(r => r.label) })
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="student-template.xlsx"`,
    },
  })
}
