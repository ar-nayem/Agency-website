export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { sendMail, passwordResetTemplate } from '@/src/lib/email'
import { NextRequest, NextResponse } from 'next/server'
import { randomInt, createHash } from 'crypto'

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

    // 6-digit numeric code — easy to read and retype from an email, unlike a link token.
    const code = String(randomInt(100000, 1000000))
    const resetTokenHash = createHash('sha256').update(code).digest('hex')
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash, resetTokenExpiresAt },
    })

    await sendMail(user.email, 'Your password reset code', passwordResetTemplate(user.name, code))

    return generic
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error)
    return NextResponse.json({ message: 'If that email is registered, a reset link has been sent.' })
  }
}
