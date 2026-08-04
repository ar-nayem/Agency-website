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

    const users = await prisma.user.findMany({
      where: { role: { not: 'DELETED' } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
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
