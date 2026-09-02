export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { FEATURE_KEYS } from '@/src/lib/features'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

function serializePackage(p: { features: string; [k: string]: unknown }) {
  let features: string[] = []
  try {
    const parsed = JSON.parse(p.features)
    if (Array.isArray(parsed)) features = parsed.filter((x) => typeof x === 'string')
  } catch {}
  return { ...p, features }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const packages = await prisma.package.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { organizations: true } } },
    })
    return NextResponse.json(packages.map(serializePackage))
  } catch (error) {
    console.error('GET /api/platform/packages error:', error)
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, studentLimit, sortOrder } = body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const features: string[] = Array.isArray(body.features)
      ? body.features.filter((f: unknown): f is string => typeof f === 'string' && FEATURE_KEYS.includes(f))
      : []

    const pkg = await prisma.package.create({
      data: {
        name: name.trim(),
        description: description || null,
        features: JSON.stringify(features),
        studentLimit: studentLimit === null || studentLimit === undefined ? null : Number(studentLimit),
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    })

    await logActivity(user.id, 'PACKAGE_CREATED', pkg.name)

    return NextResponse.json(serializePackage(pkg), { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A package with this name already exists' }, { status: 400 })
    }
    console.error('POST /api/platform/packages error:', error)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}
