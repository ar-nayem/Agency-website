export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, canAccessPortals } from '@/src/lib/session'
import { categorizeAdmitStatus, STATUS_CATEGORIES } from '@/src/lib/portalStatus'
import { NextRequest, NextResponse } from 'next/server'

// Powers the chip badges (category counts, matched/unmatched counts) without
// ever pulling row data — groupBy/count aggregate in the database, so this
// stays cheap regardless of table size, unlike the old client-side approach
// that required holding every matching row (with relations) in memory just
// to count them.
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
    if (portalId) common.portalId = portalId
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

    // Category buckets: every other filter applied except category itself
    // (each chip needs to show what selecting IT would return).
    const categoryWhere = { ...common }
    if (matched === '1') categoryWhere.matchedStudentId = { not: null }
    if (matched === '0') categoryWhere.matchedStudentId = null

    const grouped = await prisma.portalStudentSnapshot.groupBy({
      by: ['admitStatus'],
      where: categoryWhere,
      _count: true,
    })

    const byCategory: Record<string, number> = { ALL: 0 }
    for (const cat of STATUS_CATEGORIES) byCategory[cat] = 0
    for (const g of grouped) {
      const cat = categorizeAdmitStatus(g.admitStatus)
      byCategory[cat] = (byCategory[cat] || 0) + g._count
      byCategory.ALL += g._count
    }

    // Match buckets: every other filter applied except matched itself.
    const matchWhere = { ...common }
    if (category) {
      // admitStatus has no column-level mapping to category, so this one
      // filter still needs the codes for the selected bucket resolved in JS
      // — cheap since it's just picking which raw codes count, not scanning rows.
      const grouped2 = await prisma.portalStudentSnapshot.groupBy({ by: ['admitStatus'], where: common })
      const codes = grouped2.map((g) => g.admitStatus).filter((code) => categorizeAdmitStatus(code) === category)
      matchWhere.admitStatus = { in: codes }
    }

    const [matchedCount, unmatchedCount] = await Promise.all([
      prisma.portalStudentSnapshot.count({ where: { ...matchWhere, matchedStudentId: { not: null } } }),
      prisma.portalStudentSnapshot.count({ where: { ...matchWhere, matchedStudentId: null } }),
    ])

    return NextResponse.json({
      byCategory,
      byMatch: { ALL: matchedCount + unmatchedCount, MATCHED: matchedCount, UNMATCHED: unmatchedCount },
    })
  } catch (error) {
    console.error('GET /api/portals/students/counts error:', error)
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 })
  }
}
