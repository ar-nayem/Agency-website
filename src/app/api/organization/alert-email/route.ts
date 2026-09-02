export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, orgHasFeature } from '@/src/lib/session'
import { requireOrgId } from '@/src/lib/orgScope'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

// The address this organization's own alert mail goes to. Owner-managed:
// a company shouldn't have to ask the platform operator to change where its
// notifications land. Falls back to the owner's login address when unset,
// which is what getAlertRecipients does, so `effective` here always matches
// where mail will actually be delivered.
async function resolve(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { alertEmail: true },
  })
  const owner = await prisma.user.findFirst({
    where: { role: 'OWNER', organizationId },
    select: { email: true },
  })
  return {
    alertEmail: org?.alertEmail ?? null,
    ownerEmail: owner?.email ?? null,
    effective: org?.alertEmail || owner?.email || null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })
    if (!(await orgHasFeature(orgId, 'alert_settings'))) {
      return NextResponse.json({ error: 'Alert Settings is not included in your plan' }, { status: 403 })
    }

    return NextResponse.json(await resolve(orgId))
  } catch (error) {
    console.error('GET /api/organization/alert-email error:', error)
    return NextResponse.json({ error: 'Failed to load alert email' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })
    if (!(await orgHasFeature(orgId, 'alert_settings'))) {
      return NextResponse.json({ error: 'Alert Settings is not included in your plan' }, { status: 403 })
    }

    const body = await req.json()
    const raw = typeof body.alertEmail === 'string' ? body.alertEmail.trim() : ''
    if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    // Empty clears it back to the owner's address rather than storing '' —
    // getAlertRecipients treats null as "use the owner", not "send nowhere".
    await prisma.organization.update({
      where: { id: orgId },
      data: { alertEmail: raw || null },
    })
    await logActivity(user.id, 'ALERT_EMAIL_UPDATED', raw || '(cleared — using owner address)')

    return NextResponse.json(await resolve(orgId))
  } catch (error) {
    console.error('PATCH /api/organization/alert-email error:', error)
    return NextResponse.json({ error: 'Failed to save alert email' }, { status: 500 })
  }
}
