export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { sendMail, passwordResetTemplate } from '@/src/lib/email'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

// Always returns the same generic response regardless of whether the email
// exists — an attacker probing this endpoint shouldn't learn which emails
// are registered.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const generic = NextResponse.json({ message: 'If that email is registered, a reset link has been sent.' })
    if (!email || typeof email !== 'string') return generic

    const user = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (!user || !user.isActive || user.role === 'DELETED') return generic

    const rawToken = randomBytes(32).toString('hex')
    const resetTokenHash = createHash('sha256').update(rawToken).digest('hex')
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash, resetTokenExpiresAt },
    })

    const origin = new URL(req.url).origin
    const resetUrl = `${origin}/reset-password?email=${encodeURIComponent(user.email)}&token=${rawToken}`
    await sendMail(user.email, 'Reset your password', passwordResetTemplate(user.name, resetUrl))

    return generic
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error)
    return NextResponse.json({ message: 'If that email is registered, a reset link has been sent.' })
  }
}
