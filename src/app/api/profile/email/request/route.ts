export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { compare } from 'bcryptjs'
import { randomInt, createHash } from 'crypto'
import { sendMail, emailChangeVerificationTemplate } from '@/src/lib/email'
import { NextRequest, NextResponse } from 'next/server'

// Step 1 of a self-service email change, open to any logged-in role.
// Requires the current password (defends against a hijacked/left-open
// session) and verifies the new address by emailing a code to IT, not the
// old address — catches typos before they lock someone out of their account.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { newEmail, currentPassword } = await req.json()
    if (!newEmail || !currentPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const trimmed = String(newEmail).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const validPassword = await compare(currentPassword, dbUser.password)
    if (!validPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    if (trimmed === dbUser.email.toLowerCase()) {
      return NextResponse.json({ error: 'That is already your current email' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmed } })
    if (existing) {
      return NextResponse.json({ error: 'That email is already in use' }, { status: 400 })
    }

    const code = String(randomInt(100000, 1000000))
    const pendingEmailTokenHash = createHash('sha256').update(code).digest('hex')
    const pendingEmailTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { pendingEmail: trimmed, pendingEmailTokenHash, pendingEmailTokenExpiresAt },
    })

    await sendMail(trimmed, 'Confirm your new email address', emailChangeVerificationTemplate(dbUser.name, code))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/profile/email/request error:', error)
    return NextResponse.json({ error: 'Failed to start email change' }, { status: 500 })
  }
}
