export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { orgWhere, isSameOrg, requireOrgId } from '@/src/lib/orgScope'
import { sendMail, taskAssignedTemplate } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

// OWNER sees every task in their org; ADMIN sees only tasks assigned to them.
export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: any = { ...orgWhere(user) }
    if (user.role === 'ADMIN') where.assignedToId = user.id

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { dueAt: 'asc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// OWNER only — assigns a task to one of their own ADMINs.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) return NextResponse.json({ error: 'No active organization context' }, { status: 400 })

    const body = await req.json()
    const { title, description, dueAt, assignedToId } = body

    if (!title || !dueAt || !assignedToId) {
      return NextResponse.json({ error: 'title, dueAt, and assignedToId are required' }, { status: 400 })
    }
    const dueDate = new Date(dueAt)
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'dueAt must be a valid date' }, { status: 400 })
    }

    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } })
    if (!assignee || !isSameOrg(user, assignee) || assignee.role !== 'ADMIN') {
      return NextResponse.json({ error: 'assignedToId must be an admin in your organization' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        dueAt: dueDate,
        organizationId: orgId,
        createdById: user.id,
        assignedToId: assignee.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    await sendMail(
      assignee.email,
      `New task: ${task.title}`,
      taskAssignedTemplate(assignee.name, task.title, task.dueAt, task.description, user.name)
    )

    await logActivity(user.id, 'TASK_CREATED', `${task.title} → ${assignee.name} (due ${task.dueAt.toISOString()})`)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
