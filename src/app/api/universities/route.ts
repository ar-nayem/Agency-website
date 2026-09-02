export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole, orgHasFeature } from '@/src/lib/session'
import { orgWhere, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'

// University Portals (login credentials for scraping an application portal)
// already names every university the org works with — no reason to make
// someone retype that list here. Any portal without a matching University
// row (by name, case-insensitive) gets one created on the fly, attributed
// to whoever added the portal. One-way and lazy: renaming a portal later
// doesn't rename the University row, it just leaves the old name in place
// as a normal manually-added entry.
async function syncFromPortals(user: { role: string; organizationId: string | null }) {
  const portals = await prisma.universityPortal.findMany({
    where: orgWhere(user),
    select: { name: true, createdById: true, organizationId: true },
  })
  if (portals.length === 0) return

  const existing = await prisma.university.findMany({
    where: orgWhere(user),
    select: { name: true },
  })
  const existingNames = new Set(existing.map(u => u.name.trim().toLowerCase()))

  const seen = new Set<string>()
  const toCreate = portals.filter(p => {
    const key = p.name.trim().toLowerCase()
    if (!key || existingNames.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (toCreate.length > 0) {
    await prisma.university.createMany({
      data: toCreate.map(p => ({
        name: p.name.trim(),
        createdById: p.createdById,
        organizationId: p.organizationId,
      })),
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'universities'))) {
      return NextResponse.json({ error: 'Universities is not included in your plan' }, { status: 403 })
    }

    await syncFromPortals(user)

    const universities = await prisma.university.findMany({
      where: orgWhere(user),
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(universities)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch universities' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'universities'))) {
      return NextResponse.json({ error: 'Universities is not included in your plan' }, { status: 403 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization context' }, { status: 400 })
    }

    const body = await req.json()
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // SQLite string equality is case-sensitive, so this can't be pushed into
    // the query (no `mode: 'insensitive'` on this provider) — fetch names
    // and compare in JS, matching syncFromPortals' comparison exactly.
    const key = body.name.trim().toLowerCase()
    const existing = await prisma.university.findMany({ where: orgWhere(user), select: { name: true } })
    if (existing.some(u => u.name.trim().toLowerCase() === key)) {
      return NextResponse.json({ error: 'A university with this name already exists' }, { status: 409 })
    }

    const university = await prisma.university.create({
      data: {
        name: body.name,
        country: typeof body.country === 'string' ? body.country : null,
        notes: typeof body.notes === 'string' ? body.notes : null,
        createdById: user.id,
        organizationId: orgId,
      },
    })
    return NextResponse.json(university, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create university' }, { status: 500 })
  }
}
