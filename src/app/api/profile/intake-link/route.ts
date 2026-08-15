export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { studentIntakeCode: true } })
    if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (dbUser.studentIntakeCode) {
      return NextResponse.json({ code: dbUser.studentIntakeCode })
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { studentIntakeCode: randomUUID() },
      select: { studentIntakeCode: true },
    })

    return NextResponse.json({ code: updated.studentIntakeCode })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch application link' }, { status: 500 })
  }
}

// Regenerating invalidates the previous link immediately — anyone holding
// the old one can no longer submit an application through it.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { studentIntakeCode: randomUUID() },
      select: { studentIntakeCode: true },
    })

    return NextResponse.json({ code: updated.studentIntakeCode })
  } catch {
    return NextResponse.json({ error: 'Failed to regenerate application link' }, { status: 500 })
  }
}
