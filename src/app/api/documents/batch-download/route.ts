export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { studentIds } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'No students selected' }, { status: 400 })
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { documents: true }
    })

    const zip = new JSZip()

    for (const student of students) {
      const studentFolder = zip.folder(`${student.passportFamilyName}-${student.givenName}-${student.id.slice(0, 8)}`)
      if (!studentFolder) continue

      for (const doc of student.documents) {
        try {
          const filePath = join(process.cwd(), 'public', 'uploads', doc.filename)
          const fileData = await readFile(filePath)
          studentFolder.file(doc.originalName, fileData)
        } catch {
          // Skip files that can't be read
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' })
    
    return new NextResponse(Buffer.from(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="documents-batch-${Date.now()}.zip"`
      }
    })
  } catch (error) {
    console.error('Batch download error:', error)
    return NextResponse.json({ error: 'Failed to create zip' }, { status: 500 })
  }
}
