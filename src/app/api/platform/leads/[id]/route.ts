export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { logActivity } from '@/src/lib/activity'
import { normaliseEmail, isValidEmail } from '@/src/lib/leads'
import { NextRequest, NextResponse } from 'next/server'

// Only manually-added leads are editable here. A portal account holder is
// edited through the account itself, not this list.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const body = await req.json()
    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.email === 'string' && body.email.trim()) {
      if (!isValidEmail(body.email)) {
        return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
      }
      data.email = normaliseEmail(body.email)
    }
    if ('organizationName' in body) data.organizationName = body.organizationName?.trim() || null
    if ('phone' in body) data.phone = body.phone?.trim() || null
    if ('country' in body) data.country = body.country?.trim() || null
    if ('notes' in body) data.notes = body.notes?.trim() || null
    if (typeof body.marketingOptOut === 'boolean') data.marketingOptOut = body.marketingOptOut

    const lead = await prisma.lead.update({ where: { id }, data })
    return NextResponse.json(lead)
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'That email is already in your leads' }, { status: 400 })
    }
    console.error('PATCH /api/platform/leads/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    await prisma.lead.delete({ where: { id } })
    await logActivity(user.id, 'LEAD_DELETED', `${existing.name} <${existing.email}>`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/platform/leads/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
  }
}
