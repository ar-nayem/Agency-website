export const dynamic = 'force-dynamic'

import { writeFile } from 'fs/promises'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, isAdminRole, canManageOfficialDocs } from '@/src/lib/session'
import { isSameOrg, requireOrgId } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = requireOrgId(user)
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization context' }, { status: 400 })
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
    if (!student || !isSameOrg(user, student)) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (!isAdminRole(user.role) && student.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requirement = await prisma.documentRequirement.findFirst({ where: { organizationId: orgId, key: category } })
    if (requirement?.isOfficial && !(await canManageOfficialDocs(user))) {
      return NextResponse.json({ error: 'Only the owner or a permitted admin can upload official documents' }, { status: 403 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const rawExt = file.name.split('.').pop() || ''
    const ext = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt : 'bin'
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
        uploadedById: user.id,
        organizationId: orgId
      }
    })

    await logActivity(user.id, 'DOCUMENT_UPLOADED', `${file.name} → ${student.fullName}`)

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
