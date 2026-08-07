export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { hash } from 'bcryptjs'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: any = { role: { not: 'DELETED' } }
    if (user.role === 'ADMIN') {
      const managedCount = await prisma.user.count({ where: { managedByAdminId: user.id } })
      // Once the owner has assigned at least one agent to this admin, narrow their
      // roster to just that team. Unassigned admins keep seeing everyone (unchanged default).
      if (managedCount > 0) where.managedByAdminId = user.id
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        managedByAdminId: true,
        managedByAdmin: { select: { id: true, name: true } },
        canViewPortals: true,
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, password, role } = body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const hashed = await hash(password, 12)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role || 'AGENT',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    // Send welcome message from owner if configured
    try {
      const ownerOrg = await prisma.organizationProfile.findFirst({
        where: { user: { role: 'OWNER' } },
      })
      if (ownerOrg?.welcomeMessage) {
        const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } })
        if (owner) {
          await prisma.message.create({
            data: {
              content: ownerOrg.welcomeMessage,
              senderId: owner.id,
              receiverId: newUser.id,
            }
          })
        }
      }
    } catch (e) {
      console.error('Failed to send welcome message:', e)
    }

    await logActivity(user.id, 'ACCOUNT_CREATED', `${newUser.name} (${newUser.role})`)

    return NextResponse.json(newUser, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
