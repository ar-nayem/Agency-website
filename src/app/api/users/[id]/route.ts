export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const updated = await prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (id === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const studentCount = await prisma.student.count({ where: { agentId: id } })
    if (studentCount > 0) {
      return NextResponse.json({
        error: `Cannot delete: ${studentCount} student${studentCount === 1 ? '' : 's'} still assigned to this account. Reassign or delete them first.`
      }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json({
        error: 'Cannot delete: this account still has related records (messages, documents, or activity logs).'
      }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
