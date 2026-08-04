export const dynamic = 'force-dynamic'

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
    }

    let attachmentType: 'IMAGE' | 'VIDEO' | 'PDF'
    if (file.type.startsWith('image/')) attachmentType = 'IMAGE'
    else if (file.type.startsWith('video/')) attachmentType = 'VIDEO'
    else if (file.type === 'application/pdf') attachmentType = 'PDF'
    else return NextResponse.json({ error: 'Only images, videos and PDFs are supported' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split('.').pop() || ''
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    await writeFile(join(uploadDir, filename), buffer)

    return NextResponse.json({
      url: `/uploads/${filename}`,
      name: file.name,
      type: attachmentType,
      size: file.size,
    }, { status: 201 })
  } catch (error) {
    console.error('Message upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
