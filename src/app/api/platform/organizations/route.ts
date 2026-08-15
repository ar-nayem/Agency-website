export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { DEFAULT_DOCUMENT_REQUIREMENTS } from '@/src/lib/orgDefaults'
import { logActivity } from '@/src/lib/activity'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, slug: true, status: true, planTier: true, studentLimit: true,
        createdAt: true, suspendedAt: true, suspendedReason: true,
        _count: { select: { users: true, students: true } },
      },
    })
    return NextResponse.json(orgs)
  } catch (error) {
    console.error('GET /api/platform/organizations error:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}

// Creates the org + its first OWNER account atomically, seeded with the
// standard starter document-requirement list so a new tenant isn't empty.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { organizationName, ownerName, ownerEmail, ownerPassword } = body

    if (!organizationName || !ownerName || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: 'organizationName, ownerName, ownerEmail, ownerPassword are all required' }, { status: 400 })
    }
    if (ownerPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const baseSlug = slugify(organizationName) || 'org'
    let slug = baseSlug
    let suffix = 1
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: ownerEmail.trim() } })
    if (existingEmail) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const hashed = await hash(ownerPassword, 12)

    const { org, owner } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: organizationName.trim(), slug, createdByUserId: user.id },
      })
      const owner = await tx.user.create({
        data: {
          name: ownerName.trim(),
          email: ownerEmail.trim(),
          password: hashed,
          role: 'OWNER',
          isActive: true,
          organizationId: org.id,
        },
        select: { id: true, name: true, email: true },
      })
      await tx.documentRequirement.createMany({
        data: DEFAULT_DOCUMENT_REQUIREMENTS.map((d) => ({ ...d, organizationId: org.id })),
      })
      await tx.scanSettings.create({ data: { organizationId: org.id } })
      return { org, owner }
    })

    await logActivity(user.id, 'ORGANIZATION_CREATED', `${org.name} (owner: ${owner.email})`)

    return NextResponse.json({ organization: org, owner }, { status: 201 })
  } catch (error) {
    console.error('POST /api/platform/organizations error:', error)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }
}
