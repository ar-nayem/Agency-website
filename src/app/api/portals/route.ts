export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, canAccessPortals } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { encryptCredential } from '@/src/lib/credentialCrypto'
import { logActivity } from '@/src/lib/activity'

function isOwner(role: string | undefined) {
  return role === 'OWNER'
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !(await canAccessPortals(user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // A granted admin can see student status changes, but the actual portal
    // login URL/username stay an owner-only operational detail.
    const owner = isOwner(user.role)
    const portals = await prisma.universityPortal.findMany({
      select: {
        id: true, name: true, isActive: true,
        loginUrl: owner, username: owner, platform: owner,
        lastScanAt: true, lastScanStatus: true, lastScanError: true, lastScanCount: true,
        createdAt: true, createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(portals)
  } catch (error) {
    console.error('GET /api/portals error:', error)
    return NextResponse.json({ error: 'Failed to fetch portals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, loginUrl, username, password } = body
    if (!name || !loginUrl || !username || !password) {
      return NextResponse.json({ error: 'name, loginUrl, username, password are required' }, { status: 400 })
    }
    try {
      new URL(loginUrl)
    } catch {
      return NextResponse.json({ error: 'loginUrl must be a valid URL' }, { status: 400 })
    }

    const portal = await prisma.universityPortal.create({
      data: {
        name, loginUrl, username,
        passwordEnc: encryptCredential(password),
        createdById: user.id,
      },
      select: { id: true, name: true, loginUrl: true, username: true, isActive: true, createdAt: true },
    })

    await logActivity(user.id, 'PORTAL_CREATED', `Added university portal: ${portal.name}`)
    return NextResponse.json(portal, { status: 201 })
  } catch (error) {
    console.error('POST /api/portals error:', error)
    return NextResponse.json({ error: 'Failed to create portal' }, { status: 500 })
  }
}
