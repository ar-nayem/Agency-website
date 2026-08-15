export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { encryptCredential } from '@/src/lib/credentialCrypto'
import { logActivity } from '@/src/lib/activity'

function isOwner(role: string | undefined) {
  return role === 'OWNER'
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const existing = await prisma.universityPortal.findUnique({ where: { id } })
    if (!existing || !isSameOrg(user, existing)) return NextResponse.json({ error: 'Portal not found' }, { status: 404 })

    const body = await req.json()
    const data: any = {}
    if (body.name !== undefined) data.name = body.name
    if (body.loginUrl !== undefined) {
      try { new URL(body.loginUrl) } catch { return NextResponse.json({ error: 'loginUrl must be a valid URL' }, { status: 400 }) }
      data.loginUrl = body.loginUrl
    }
    if (body.username !== undefined) data.username = body.username
    if (body.password) data.passwordEnc = encryptCredential(body.password)
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    if (body.platform !== undefined) data.platform = body.platform
    if (body.useProxy !== undefined) data.useProxy = !!body.useProxy

    const portal = await prisma.universityPortal.update({
      where: { id },
      data,
      select: { id: true, name: true, loginUrl: true, username: true, isActive: true, platform: true, useProxy: true },
    })

    await logActivity(user.id, 'PORTAL_UPDATED', `Updated university portal: ${portal.name}`)
    return NextResponse.json(portal)
  } catch (error) {
    console.error('PATCH /api/portals/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update portal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const existing = await prisma.universityPortal.findUnique({ where: { id } })
    if (!existing || !isSameOrg(user, existing)) return NextResponse.json({ error: 'Portal not found' }, { status: 404 })

    await prisma.universityPortal.delete({ where: { id } })
    await logActivity(user.id, 'PORTAL_DELETED', `Removed university portal: ${existing.name}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/portals/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete portal' }, { status: 500 })
  }
}
