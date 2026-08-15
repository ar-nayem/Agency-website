export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'fs'
import { access } from 'fs/promises'
import { join } from 'path'
import { Readable } from 'stream'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const filePath = join(process.cwd(), 'public', 'uploads', doc.filename)
  try {
    await access(filePath)
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
  }

  const downloadName = req.nextUrl.searchParams.get('download')
  const webStream = Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Length': String(doc.size),
      'Content-Disposition': downloadName
        ? `attachment; filename="${encodeURIComponent(downloadName)}"`
        : 'inline',
      'Cache-Control': 'private, max-age=0'
    }
  })
}
