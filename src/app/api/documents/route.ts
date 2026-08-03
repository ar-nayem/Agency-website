export const dynamic = 'force-dynamic'

import { writeFile } from 'fs/promises'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const studentId = formData.get('studentId') as string
    const type = formData.get('type') as string
    const category = formData.get('category') as string || 'OTHER'

    if (!file || !studentId || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!isAdminRole(user.role) && student.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split('.').pop() || ''
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    let docType: 'PDF' | 'IMAGE' | 'VIDEO' = 'PDF'
    if (type === 'image' || file.type.startsWith('image/')) docType = 'IMAGE'
    else if (type === 'video' || file.type.startsWith('video/')) docType = 'VIDEO'

    const doc = await prisma.document.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        type: docType,
        category,
        studentId,
        uploadedById: user.id
      }
    })

    await logActivity(user.id, 'DOCUMENT_UPLOADED', `${file.name} → ${student.fullName}`)

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
