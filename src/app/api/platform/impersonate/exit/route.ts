export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!user.isImpersonating || !user.organizationId) {
      return NextResponse.json({ error: 'Not currently impersonating' }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { name: true } })
    await logActivity(user.id, 'IMPERSONATION_END', `Exited ${org?.name || user.organizationId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/platform/impersonate/exit error:', error)
    return NextResponse.json({ error: 'Failed to exit impersonation' }, { status: 500 })
  }
}
