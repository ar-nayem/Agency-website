export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { sendMail, taskCompletedTemplate } from '@/src/lib/email'
import { TASK_STATUSES } from '@/src/lib/tasks'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { createdBy: { select: { name: true, email: true } }, assignedTo: { select: { name: true } } },
    })
    if (!existing || !isSameOrg(user, existing)) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (user.role === 'ADMIN') {
      // An assigned admin can only move their own task between statuses —
      // nothing else about the task (title, deadline, assignee) is theirs to change.
      if (existing.assignedToId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!TASK_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `status must be one of ${TASK_STATUSES.join(', ')}` }, { status: 400 })
      }
      data.status = body.status
      data.completedAt = body.status === 'COMPLETED' ? new Date() : null
    } else {
      // OWNER can edit the task itself (not mark it complete on someone else's behalf).
      if (typeof body.title === 'string') data.title = body.title
      if ('description' in body) data.description = body.description || null
      if (body.dueAt) {
        const d = new Date(body.dueAt)
        if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'dueAt must be a valid date' }, { status: 400 })
        data.dueAt = d
        data.overdueNotifiedAt = null // deadline moved — allow a fresh overdue notice if it lapses again
      }
    }

    const updated = await prisma.task.update({ where: { id }, data })

    if (data.status === 'COMPLETED') {
      await sendMail(
        existing.createdBy.email,
        `Task completed: ${existing.title}`,
        taskCompletedTemplate(existing.assignedTo.name, existing.title, updated.completedAt as Date)
      )
      await logActivity(user.id, 'TASK_COMPLETED', existing.title)
    } else {
      await logActivity(user.id, 'TASK_UPDATED', existing.title)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing || !isSameOrg(user, existing)) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({ where: { id } })
    await logActivity(user.id, 'TASK_DELETED', existing.title)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
