export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

// Only validates + logs — the client applies the actual session change via
// next-auth's session.update({ impersonatingOrgId }) right after this call
// succeeds (see src/lib/auth.ts's jwt callback for how that's picked up).
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (user.isImpersonating) {
      return NextResponse.json({ error: 'Exit the current impersonation session first' }, { status: 400 })
    }

    const { organizationId } = await req.json()
    if (!organizationId) return NextResponse.json({ error: 'organizationId is required' }, { status: 400 })

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    await logActivity(user.id, 'IMPERSONATION_START', `Entered ${org.name} as OWNER`)

    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error('POST /api/platform/impersonate error:', error)
    return NextResponse.json({ error: 'Failed to start impersonation' }, { status: 500 })
  }
}
