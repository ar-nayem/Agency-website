export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { parseStudentWorkbook } from '@/src/lib/studentExcel'
import { createStudentFromData } from '@/src/lib/createStudent'
import { sendNotification, studentSubmissionTemplate } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'

const REQUIRED_FIELDS = ['passportFamilyName', 'givenName', 'fullName', 'passportNo', 'mainEmail']

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { studentData, educationHistory, workExperience, familyMembers, financialSponsors } = parseStudentWorkbook(buffer)

    const missing = REQUIRED_FIELDS.filter(f => !studentData[f])
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields in the "Student" sheet: ${missing.join(', ')}` }, { status: 400 })
    }

    const student = await createStudentFromData(user.id, studentData, {
      educationHistory, workExperience, familyMembers, financialSponsors,
    })

    await sendNotification(
      'New Student Submission',
      studentSubmissionTemplate(student.agent.name, student.fullName)
    )
    await logActivity(user.id, 'STUDENT_CREATED', `${student.fullName} (${student.serialNumber}) via Excel import`)

    return NextResponse.json(student, { status: 201 })
  } catch (error: any) {
    console.error('Student import error:', error)
    return NextResponse.json({ error: 'Failed to import student', details: error?.message || String(error) }, { status: 500 })
  }
}
