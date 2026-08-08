export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, canAccessPortals } from '@/src/lib/session'
import { categorizeAdmitStatus, STATUS_CATEGORIES } from '@/src/lib/portalStatus'
import { NextRequest, NextResponse } from 'next/server'

// Powers every count badge on the Students tab (category chips, match chips,
// university dropdown) without ever pulling row data — groupBy/count
// aggregate in the database, so this stays cheap regardless of table size,
// unlike the old client-side approach that required holding every matching
// row (with relations) in memory just to count them.
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

    const common: any = {}
    if (search) {
      common.OR = [
        { passportName: { contains: search } },
        { passportNo: { contains: search } },
      ]
    }
    if (dateFrom || dateTo) {
      common.appliedAt = {}
      if (dateFrom) common.appliedAt.gte = new Date(`${dateFrom}T00:00:00`)
      if (dateTo) common.appliedAt.lte = new Date(`${dateTo}T23:59:59.999`)
    }

    // Which raw admitStatus codes fall into the selected category — a pure
    // function of the code, but the actual codes in use aren't knowable
    // without asking the DB once (categorizeAdmitStatus has no DB-expressible
    // form since "PROCESSING" is "anything not in the known map").
    let categoryCodes: (string | null)[] | null = null
    if (category) {
      const allCodes = await prisma.portalStudentSnapshot.groupBy({ by: ['admitStatus'], where: common })
      categoryCodes = allCodes.map((g) => g.admitStatus).filter((code) => categorizeAdmitStatus(code) === category)
    }

    const withCategory = (where: any) => (categoryCodes ? { ...where, admitStatus: { in: categoryCodes } } : where)
    const withPortal = (where: any) => (portalId ? { ...where, portalId } : where)
    const withMatched = (where: any) => {
      if (matched === '1') return { ...where, matchedStudentId: { not: null } }
      if (matched === '0') return { ...where, matchedStudentId: null }
      return where
    }

    // Each dimension's counts apply every OTHER filter, but not its own —
    // a chip needs to show what selecting IT would return.
    const categoryScope = withMatched(withPortal(common))
    const matchScope = withCategory(withPortal(common))
    const portalScope = withMatched(withCategory(common))

    const [categoryGroups, matchedCount, unmatchedCount, portalGroups] = await Promise.all([
      prisma.portalStudentSnapshot.groupBy({ by: ['admitStatus'], where: categoryScope, _count: true }),
      prisma.portalStudentSnapshot.count({ where: { ...matchScope, matchedStudentId: { not: null } } }),
      prisma.portalStudentSnapshot.count({ where: { ...matchScope, matchedStudentId: null } }),
      prisma.portalStudentSnapshot.groupBy({ by: ['portalId'], where: portalScope, _count: true }),
    ])

    const byCategory: Record<string, number> = { ALL: 0 }
    for (const cat of STATUS_CATEGORIES) byCategory[cat] = 0
    for (const g of categoryGroups) {
      const cat = categorizeAdmitStatus(g.admitStatus)
      byCategory[cat] = (byCategory[cat] || 0) + g._count
      byCategory.ALL += g._count
    }

    const byPortal: Record<string, number> = { ALL: 0 }
    for (const g of portalGroups) {
      byPortal[g.portalId] = g._count
      byPortal.ALL += g._count
    }

    return NextResponse.json({
      byCategory,
      byMatch: { ALL: matchedCount + unmatchedCount, MATCHED: matchedCount, UNMATCHED: unmatchedCount },
      byPortal,
    })
  } catch (error) {
    console.error('GET /api/portals/students/counts error:', error)
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 })
  }
}
