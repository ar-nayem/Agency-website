export const dynamic = 'force-dynamic'

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole } from '@/src/lib/session'
import { isSameOrg, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'
import { matchByFilename } from '@/src/lib/universityDocMatch'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization context' }, { status: 400 })
    }

    const { id: universityId } = await params
    const university = await prisma.university.findUnique({ where: { id: universityId } })
    if (!university || !isSameOrg(user, university)) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const category = (formData.get('category') as string) || 'OTHER'
    const studentId = (formData.get('studentId') as string) || null

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (studentId) {
      const student = await prisma.student.findUnique({ where: { id: studentId }, select: { organizationId: true } })
      if (!student || !isSameOrg(user, student)) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'universities')
    await mkdir(uploadDir, { recursive: true })

    const rawExt = file.name.split('.').pop() || ''
    const ext = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt : 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Filename-based detection only runs when nobody already tagged a
    // student — cheap enough (one query, plain string matching) to do
    // inline, no background job needed.
    let ocrStatus = 'SKIPPED'
    let suggestedStudentId: string | null = null
    let suggestedMatchReason: string | null = null
    if (!studentId) {
      const match = await matchByFilename(file.name, orgId)
      if (match) {
        ocrStatus = 'SUGGESTED'
        suggestedStudentId = match.studentId
        suggestedMatchReason = match.reason
      } else {
        ocrStatus = 'NO_MATCH'
      }
    }

    const doc = await prisma.universityDocument.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        category,
        universityId,
        studentId,
        uploadedById: user.id,
        organizationId: orgId,
        ocrStatus,
        suggestedStudentId,
        suggestedMatchReason,
      },
    })

    await logActivity(user.id, 'UNIVERSITY_DOCUMENT_UPLOADED', `${file.name} → ${university.name}`)

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('University document upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
