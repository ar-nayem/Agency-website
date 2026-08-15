export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { student: true }
    })

    if (!doc || !isSameOrg(user, doc)) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!isAdminRole(user.role) && doc.student.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      await unlink(join(process.cwd(), 'public', 'uploads', doc.filename))
    } catch {
      // File may not exist
    }

    await prisma.document.delete({ where: { id } })
    await logActivity(user.id, 'DOCUMENT_DELETED', `${doc.originalName} → ${doc.student.fullName}`)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
