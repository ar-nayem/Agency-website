export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, canAccessPortals } from '@/src/lib/session'
import { orgWhereVia } from '@/src/lib/orgScope'
import { categorizeAdmitStatus, STATUS_CATEGORIES } from '@/src/lib/portalStatus'
import { NextRequest, NextResponse } from 'next/server'

// Powers every count badge on the Students tab (category chips, match chips,
// university dropdown) without ever pulling row data — groupBy/count
// aggregate in the database, so this stays cheap regardless of table size,
// unlike the old client-side approach that required holding every matching
// row (with relations) in memory just to count them.
//
// Category is portal-dependent (the same raw admitStatus code can mean
// different things at different universities — see portalStatus.ts), so
// unlike a normal column it has no DB-expressible WHERE clause. Every
// category-aware query below first resolves category -> the actual set of
// (portalId, code) pairs via the small groupBy in resolveCategoryPairs,
// then filters on those pairs explicitly.
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

    const common: any = { ...orgWhereVia(user, 'portal') }
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

    const categoryWhereClause = async (cat: string): Promise<any> => {
      const groups = await prisma.portalStudentSnapshot.groupBy({ by: ['portalId', 'admitStatus'], where: common })
      const byPortal = new Map<string, (string | null)[]>()
      for (const g of groups) {
        if (categorizeAdmitStatus(g.admitStatus, g.portalId) !== cat) continue
        const codes = byPortal.get(g.portalId) || []
        codes.push(g.admitStatus)
        byPortal.set(g.portalId, codes)
      }
      if (byPortal.size === 0) return { id: '__none__' } // matches nothing
      return {
        OR: Array.from(byPortal.entries()).map(([pid, codes]) => ({
          portalId: pid,
          OR: [
            ...(codes.some((c: string | null) => c == null) ? [{ admitStatus: null }] : []),
            ...(codes.some((c: string | null) => c != null) ? [{ admitStatus: { in: codes.filter((c): c is string => c != null) } }] : []),
          ],
        })),
      }
    }

    const withPortal = (where: any) => (portalId ? { ...where, portalId } : where)
    const withMatched = (where: any) => {
      if (matched === '1') return { ...where, matchedStudentId: { not: null } }
      if (matched === '0') return { ...where, matchedStudentId: null }
      return where
    }

    // Each dimension's counts apply every OTHER filter, but not its own —
    // a chip needs to show what selecting IT would return.
    const categoryScope = withMatched(withPortal(common))
    const matchScope = category ? { ...withPortal(common), ...(await categoryWhereClause(category)) } : withPortal(common)
    const portalScope = category ? { ...withMatched(common), ...(await categoryWhereClause(category)) } : withMatched(common)

    const [categoryGroups, matchedCount, unmatchedCount, portalGroups] = await Promise.all([
      prisma.portalStudentSnapshot.groupBy({ by: ['portalId', 'admitStatus'], where: categoryScope, _count: true }),
      prisma.portalStudentSnapshot.count({ where: { ...matchScope, matchedStudentId: { not: null } } }),
      prisma.portalStudentSnapshot.count({ where: { ...matchScope, matchedStudentId: null } }),
      prisma.portalStudentSnapshot.groupBy({ by: ['portalId'], where: portalScope, _count: true }),
    ])

    const byCategory: Record<string, number> = { ALL: 0 }
    for (const cat of STATUS_CATEGORIES) byCategory[cat] = 0
    for (const g of categoryGroups) {
      const cat = categorizeAdmitStatus(g.admitStatus, g.portalId)
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
