export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole, orgHasFeature } from '@/src/lib/session'
import { orgWhere, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, studentSubmissionTemplate } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'
import { createStudentFromData } from '@/src/lib/createStudent'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const agentId = searchParams.get('agentId')
    const search = searchParams.get('search')

    const where: any = { ...orgWhere(user) }

    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      where.agentId = user.id
    } else if (user.role === 'ADMIN') {
      const managed = await prisma.user.findMany({ where: { managedByAdminId: user.id }, select: { id: true } })
      const allowedIds = managed.length > 0 ? [...managed.map(m => m.id), user.id] : null
      // Unassigned admins (no team configured yet) keep seeing every student — unchanged default.
      if (agentId) {
        where.agentId = allowedIds && !allowedIds.includes(agentId) ? '__none__' : agentId
      } else if (allowedIds) {
        where.agentId = { in: allowedIds }
      }
    } else if (agentId) {
      where.agentId = agentId
    }

    if (status) where.status = status
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { givenName: { contains: search } },
        { passportFamilyName: { contains: search } },
        { mainEmail: { contains: search } },
        { passportNo: { contains: search } },
        { serialNumber: { contains: search } }
      ]
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true, email: true } },
        documents: true,
        _count: { select: { documents: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(students)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) {
      console.log('POST /api/students: No user from session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'student_create'))) {
      return NextResponse.json({ error: 'Adding students is not included in your plan' }, { status: 403 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization context' }, { status: 400 })
    }

    console.log('POST /api/students: user=', user)

    const body = await req.json()
    const {
      educationHistory,
      workExperience,
      familyMembers,
      financialSponsors,
      ...studentData
    } = body

    // Verify user exists (handles db reset cases)
    const userExists = await prisma.user.findUnique({ where: { id: user.id } })
    if (!userExists) {
      console.log('POST /api/students: user not found in DB, id=', user.id)
      return NextResponse.json({ error: 'Session expired. Please log out and log back in.' }, { status: 401 })
    }

    console.log('POST /api/students: creating student, agentId=', user.id)

    const student = await createStudentFromData(user.id, orgId, studentData, {
      educationHistory, workExperience, familyMembers, financialSponsors,
    })

    await sendNotification(
      'New Student Submission',
      studentSubmissionTemplate(student.agent.name, student.fullName),
      orgId
    )
    await logActivity(user.id, 'STUDENT_CREATED', `${student.fullName} (${student.serialNumber})`)

    return NextResponse.json(student, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/students error:', error)
    return NextResponse.json({ error: 'Failed to create student', details: error?.message || String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { studentIds } = await req.json()
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'No students selected' }, { status: 400 })
    }

    const where: any = { id: { in: studentIds }, ...orgWhere(user) }
    if (user.role === 'ADMIN') {
      const managed = await prisma.user.findMany({ where: { managedByAdminId: user.id }, select: { id: true } })
      if (managed.length > 0) {
        where.agentId = { in: [...managed.map(m => m.id), user.id] }
      }
    }

    const toDelete = await prisma.student.findMany({ where, select: { id: true, fullName: true } })
    if (toDelete.length === 0) {
      return NextResponse.json({ error: 'No matching students found' }, { status: 404 })
    }

    await prisma.student.deleteMany({ where: { id: { in: toDelete.map(s => s.id) } } })
    await logActivity(user.id, 'STUDENT_DELETED', `Batch deleted ${toDelete.length} student(s): ${toDelete.map(s => s.fullName).join(', ')}`)

    return NextResponse.json({ success: true, deletedCount: toDelete.length })
  } catch (error) {
    console.error('DELETE /api/students error:', error)
    return NextResponse.json({ error: 'Failed to delete students' }, { status: 500 })
  }
}
