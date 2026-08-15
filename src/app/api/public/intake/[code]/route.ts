export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { resolveIntakeUser } from '@/src/lib/intake'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, studentSubmissionTemplate } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'
import { createStudentFromData } from '@/src/lib/createStudent'

// Public — no auth. Lets the apply page confirm a staff member's intake
// code is real (and pull the org's document/field requirements) before
// showing the application form.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const agent = await resolveIntakeUser(code)
    if (!agent) {
      return NextResponse.json({ error: 'This application link is invalid or no longer active' }, { status: 404 })
    }

    const [docCategories, fieldRequirements] = await Promise.all([
      prisma.documentRequirement.findMany({
        where: { active: true, organizationId: agent.organizationId },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.fieldRequirement.findMany({
        where: { active: true, organizationId: agent.organizationId },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    return NextResponse.json({
      agentName: agent.name,
      organizationName: agent.organizationName,
      docCategories,
      fieldRequirements,
    })
  } catch (error) {
    console.error('GET /api/public/intake/[code] error:', error)
    return NextResponse.json({ error: 'Failed to load application link' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const agent = await resolveIntakeUser(code)
    if (!agent) {
      return NextResponse.json({ error: 'This application link is invalid or no longer active' }, { status: 404 })
    }

    const body = await req.json()
    const {
      educationHistory,
      workExperience,
      familyMembers,
      financialSponsors,
      ...studentData
    } = body

    const student = await createStudentFromData(agent.id, agent.organizationId, studentData, {
      educationHistory, workExperience, familyMembers, financialSponsors,
    })

    await sendNotification(
      'New Student Submission',
      studentSubmissionTemplate(student.agent.name, student.fullName),
      agent.organizationId
    )
    await logActivity(agent.id, 'STUDENT_CREATED', `${student.fullName} (${student.serialNumber})`)

    return NextResponse.json({ id: student.id, serialNumber: student.serialNumber }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/public/intake/[code] error:', error)
    return NextResponse.json({ error: 'Failed to submit application', details: error?.message || String(error) }, { status: 500 })
  }
}
