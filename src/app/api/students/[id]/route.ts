export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, statusUpdateTemplate } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true, email: true } },
        documents: true,
        educationHistory: true,
        workExperience: true,
        familyMembers: true,
        financialSponsors: true,
      }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!isAdminRole(user.role) && student.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(student)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await prisma.student.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!isAdminRole(user.role) && existing.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const student = await prisma.student.update({
      where: { id },
      data: body,
      include: {
        agent: { select: { name: true, email: true } },
        documents: true
      }
    })

    if (body.status && body.status !== existing.status) {
      await sendNotification(
        `Student Status Updated: ${body.status}`,
        statusUpdateTemplate(student.fullName, body.status, user.name || 'Admin')
      )
      await logActivity(user.id, 'STUDENT_STATUS_CHANGED', `${student.fullName}: ${existing.status} → ${body.status}`)
    } else {
      await logActivity(user.id, 'STUDENT_UPDATED', student.fullName)
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.student.findUnique({ where: { id } })
    
    if (!existing) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!isAdminRole(user.role) && existing.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.student.delete({ where: { id } })
    await logActivity(user.id, 'STUDENT_DELETED', existing.fullName)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}
