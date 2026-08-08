export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json()
    if (!email || !token || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }
    if (user.resetTokenExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'This reset link has expired' }, { status: 400 })
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
    if (tokenHash !== user.resetTokenHash) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    const hashed = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetTokenHash: null, resetTokenExpiresAt: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
