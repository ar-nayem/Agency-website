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

    const requirements = await prisma.documentRequirement.findMany()
    const labelByKey = new Map(requirements.map(r => [r.key, r.label]))
    labelByKey.set('PHOTO', 'Photo')

    const sanitize = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-').trim()

    const zip = new JSZip()

    for (const student of students) {
      const folderName = sanitize(`${student.serialNumber || student.id.slice(0, 8)}-${student.fullName}`)
      const studentFolder = zip.folder(folderName)
      if (!studentFolder) continue

      const usedNames = new Map<string, number>()

      for (const doc of student.documents) {
        try {
          const filePath = join(process.cwd(), 'public', 'uploads', doc.filename)
          const fileData = await readFile(filePath)

          const ext = doc.originalName.includes('.') ? doc.originalName.split('.').pop() : ''
          const baseName = sanitize(labelByKey.get(doc.category) || doc.originalName.replace(/\.[^.]+$/, ''))

          const count = usedNames.get(baseName) || 0
          usedNames.set(baseName, count + 1)
          const suffix = count > 0 ? ` (${count + 1})` : ''
          const finalName = ext ? `${baseName}${suffix}.${ext}` : `${baseName}${suffix}`

          studentFolder.file(finalName, fileData)
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
