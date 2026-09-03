export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        recipients: {
          select: { id: true, email: true, name: true, orgName: true, status: true, error: true, sentAt: true, openedAt: true, lastOpenedAt: true, openCount: true },
          orderBy: { email: 'asc' },
        },
        createdBy: { select: { name: true } },
      },
    })

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Open rate is measured against what actually went out, not the total
    // selected — a failed send was never an opportunity to open.
    const sent = campaign.recipients.filter((r) => r.status === 'SENT').length
    const opened = campaign.recipients.filter((r) => r.openedAt).length

    return NextResponse.json({
      ...campaign,
      stats: {
        sent,
        opened,
        openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
      },
    })
  } catch (error) {
    console.error('GET /api/platform/campaigns/[id] error:', error)
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 })
  }
}
