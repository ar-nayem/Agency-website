export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser, orgHasFeature } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { logActivity } from '@/src/lib/activity'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// Unambiguous charset — no 0/O/1/l/I — since this gets read aloud or copy-pasted to hand over.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generatePassword(length = 12): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += CHARSET[bytes[i] % CHARSET.length]
  return out
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only the owner can reset passwords' }, { status: 401 })
    }
    if (!(await orgHasFeature(user.organizationId, 'manage_accounts'))) {
      return NextResponse.json({ error: 'Manage Accounts is not included in your plan' }, { status: 403 })
    }

    const { id } = await params
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, name: true, organizationId: true } })
    if (!target || target.role === 'DELETED' || !isSameOrg(user, target)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const custom = typeof body.password === 'string' ? body.password.trim() : ''
    if (custom && custom.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    const newPassword = custom || generatePassword()

    const hashed = await hash(newPassword, 12)
    await prisma.user.update({ where: { id }, data: { password: hashed } })
    await logActivity(user.id, 'PASSWORD_RESET', `Reset password for ${target.name}`)

    // Only place this plaintext value ever exists — returned once, never stored, never logged.
    return NextResponse.json({ password: newPassword })
  } catch {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
