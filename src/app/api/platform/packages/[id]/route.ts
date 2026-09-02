export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { FEATURE_KEYS } from '@/src/lib/features'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'
import { BILLING_CYCLES } from '@/src/lib/billing'


function serializePackage(p: { features: string; [k: string]: unknown }) {
  let features: string[] = []
  try {
    const parsed = JSON.parse(p.features)
    if (Array.isArray(parsed)) features = parsed.filter((x) => typeof x === 'string')
  } catch {}
  return { ...p, features }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.package.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    const body = await req.json()
    const data: any = {}

    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if ('description' in body) data.description = body.description || null
    if ('studentLimit' in body) data.studentLimit = body.studentLimit === null ? null : Number(body.studentLimit)
    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
    if ('price' in body) data.price = body.price === null || body.price === '' ? null : Number(body.price)
    if (typeof body.currency === 'string' && body.currency.trim()) data.currency = body.currency.trim()
    if (typeof body.billingCycle === 'string') {
      if (!BILLING_CYCLES.includes(body.billingCycle)) {
        return NextResponse.json({ error: 'Unknown billing cycle' }, { status: 400 })
      }
      data.billingCycle = body.billingCycle
    }
    if (typeof body.isPublic === 'boolean') data.isPublic = body.isPublic
    if (typeof body.isTrialPlan === 'boolean') data.isTrialPlan = body.isTrialPlan
    if (Array.isArray(body.features)) {
      data.features = JSON.stringify(body.features.filter((f: unknown): f is string => typeof f === 'string' && FEATURE_KEYS.includes(f)))
    }

    const pkg = await prisma.package.update({ where: { id }, data })

    await logActivity(user.id, 'PACKAGE_UPDATED', `${pkg.name}: ${JSON.stringify(data)}`)

    return NextResponse.json(serializePackage(pkg))
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A package with this name already exists' }, { status: 400 })
    }
    console.error('PATCH /api/platform/packages/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
  }
}

// Orgs on this package fall back to unrestricted (packageId SetNull) rather
// than being blocked from everything — see the schema comment on
// Organization.packageId.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.package.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    await prisma.package.delete({ where: { id } })
    await logActivity(user.id, 'PACKAGE_DELETED', existing.name)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/platform/packages/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
  }
}
