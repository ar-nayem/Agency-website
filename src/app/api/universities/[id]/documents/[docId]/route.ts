export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: universityId, docId } = await params
    const doc = await prisma.universityDocument.findUnique({ where: { id: docId } })
    if (!doc || doc.universityId !== universityId || !isSameOrg(user, doc)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const body = await req.json()

    // Accept/dismiss a background-detected suggestion — never applied
    // automatically, always this explicit human click.
    if (body.acceptSuggestion === true) {
      if (!doc.suggestedStudentId) {
        return NextResponse.json({ error: 'No pending suggestion' }, { status: 400 })
      }
      const updated = await prisma.universityDocument.update({
        where: { id: docId },
        data: { studentId: doc.suggestedStudentId, suggestedStudentId: null, suggestedMatchReason: null, ocrStatus: 'MATCHED' },
        include: { student: { select: { id: true, fullName: true, passportNo: true, serialNumber: true } } },
      })
      return NextResponse.json(updated)
    }

    if (body.dismissSuggestion === true) {
      const updated = await prisma.universityDocument.update({
        where: { id: docId },
        data: { suggestedStudentId: null, suggestedMatchReason: null, ocrStatus: 'NO_MATCH' },
      })
      return NextResponse.json(updated)
    }

    // Manual (re)tag, or clearing a tag with studentId: null.
    if ('studentId' in body) {
      const studentId = body.studentId
      if (studentId) {
        const student = await prisma.student.findUnique({ where: { id: studentId }, select: { organizationId: true } })
        if (!student || !isSameOrg(user, student)) {
          return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }
      }
      const updated = await prisma.universityDocument.update({
        where: { id: docId },
        data: { studentId, suggestedStudentId: null, suggestedMatchReason: null, ocrStatus: studentId ? 'MATCHED' : 'SKIPPED' },
        include: { student: { select: { id: true, fullName: true, passportNo: true, serialNumber: true } } },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: universityId, docId } = await params
    const doc = await prisma.universityDocument.findUnique({
      where: { id: docId },
      include: { university: true },
    })

    if (!doc || doc.universityId !== universityId || !isSameOrg(user, doc)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    try {
      await unlink(join(process.cwd(), 'public', 'uploads', 'universities', doc.filename))
    } catch {
      // File may not exist
    }

    await prisma.universityDocument.delete({ where: { id: docId } })
    await logActivity(user.id, 'UNIVERSITY_DOCUMENT_DELETED', `${doc.originalName} → ${doc.university.name}`)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
