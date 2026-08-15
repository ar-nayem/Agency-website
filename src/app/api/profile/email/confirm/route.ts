export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { createHash } from 'crypto'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await req.json()
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || !dbUser.pendingEmail || !dbUser.pendingEmailTokenHash || !dbUser.pendingEmailTokenExpiresAt) {
      return NextResponse.json({ error: 'No pending email change — request a new code first' }, { status: 400 })
    }
    if (dbUser.pendingEmailTokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'This code has expired — request a new one' }, { status: 400 })
    }

    const codeHash = createHash('sha256').update(String(code)).digest('hex')
    if (codeHash !== dbUser.pendingEmailTokenHash) {
      return NextResponse.json({ error: 'Incorrect code' }, { status: 400 })
    }

    // Re-check uniqueness right before committing — another account could
    // have claimed this email in the window between request and confirm.
    const claimedByOther = await prisma.user.findFirst({ where: { email: dbUser.pendingEmail, id: { not: user.id } } })
    if (claimedByOther) {
      return NextResponse.json({ error: 'That email is already in use' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: dbUser.pendingEmail,
        pendingEmail: null,
        pendingEmailTokenHash: null,
        pendingEmailTokenExpiresAt: null,
      },
      select: { id: true, name: true, email: true },
    })

    await logActivity(user.id, 'EMAIL_CHANGED', `Email changed to ${updated.email}`)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('POST /api/profile/email/confirm error:', error)
    return NextResponse.json({ error: 'Failed to confirm email change' }, { status: 500 })
  }
}
