export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole } from '@/src/lib/session'
import { orgWhere } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

// Cross-university lookup: "where's this student's admission letter/JW" without
// knowing which university's page it was filed under. Only matches documents
// that were tagged with a student at upload time.
export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const q = new URL(req.url).searchParams.get('q')?.trim() || ''
    if (q.length < 2) {
      return NextResponse.json([])
    }

    const results = await prisma.universityDocument.findMany({
      where: {
        ...orgWhere(user),
        student: {
          OR: [
            { fullName: { contains: q } },
            { passportNo: { contains: q } },
          ],
        },
      },
      include: {
        university: { select: { id: true, name: true } },
        student: { select: { id: true, fullName: true, passportNo: true, serialNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 })
  }
}
