export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, studentSubmissionTemplate } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const agentId = searchParams.get('agentId')
    const search = searchParams.get('search')

    const where: any = {}
    
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      where.agentId = user.id
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
    const user = await getSessionUser(req)
    if (!user) {
      console.log('POST /api/students: No user from session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Generate serial number
    const lastStudent = await prisma.student.findFirst({
      where: { serialNumber: { not: null } },
      orderBy: { serialNumber: 'desc' },
    })
    let nextNum = 1
    if (lastStudent?.serialNumber) {
      const match = lastStudent.serialNumber.match(/(\d+)$/)
      if (match) nextNum = parseInt(match[1], 10) + 1
    }
    const serialNumber = `GL-${String(nextNum).padStart(5, '0')}`

    console.log('POST /api/students: creating student, agentId=', user.id, 'serial=', serialNumber)

    const student = await prisma.student.create({
      data: {
        ...studentData,
        serialNumber,
        agentId: user.id,
        status: 'PENDING',
        educationHistory: educationHistory?.length ? {
          create: educationHistory
        } : undefined,
        workExperience: workExperience?.length ? {
          create: workExperience
        } : undefined,
        familyMembers: familyMembers?.length ? {
          create: familyMembers
        } : undefined,
        financialSponsors: financialSponsors?.length ? {
          create: financialSponsors
        } : undefined,
      },
      include: {
        agent: { select: { name: true, email: true } },
        documents: true,
        educationHistory: true,
        workExperience: true,
        familyMembers: true,
        financialSponsors: true,
      }
    })

    await sendNotification(
      'New Student Submission',
      studentSubmissionTemplate(student.agent.name, student.fullName)
    )
    await logActivity(user.id, 'STUDENT_CREATED', `${student.fullName} (${serialNumber})`)

    return NextResponse.json(student, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/students error:', error)
    return NextResponse.json({ error: 'Failed to create student', details: error?.message || String(error) }, { status: 500 })
  }
}
