export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'
import { unlink } from 'fs/promises'
import { join } from 'path'

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
