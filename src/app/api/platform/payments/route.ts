export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'
import { PAYMENT_METHODS } from '@/src/lib/billing'


export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')

    const payments = await prisma.payment.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { organization: { select: { id: true, name: true } } },
    })
    return NextResponse.json(payments)
  } catch (error) {
    console.error('GET /api/platform/payments error:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

// Records money received and, in the same transaction, pushes the org's
// access window out to the end of the period paid for. Doing both together
// is the point: a payment that didn't extend access (or an extension with no
// payment behind it) is exactly the inconsistency this is meant to prevent.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { organizationId, amount, currency, method, reference, note, periodStart, periodEnd } = body

    if (!organizationId || amount === undefined || !periodEnd) {
      return NextResponse.json({ error: 'organizationId, amount and periodEnd are required' }, { status: 400 })
    }
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 })
    }
    if (method && !PAYMENT_METHODS.includes(method)) {
      return NextResponse.json({ error: 'Unknown payment method' }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } })
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const end = new Date(periodEnd)
    const start = periodStart ? new Date(periodStart) : new Date()
    if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid period dates' }, { status: 400 })
    }
    if (end <= start) {
      return NextResponse.json({ error: 'periodEnd must be after periodStart' }, { status: 400 })
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          organizationId,
          amount: numericAmount,
          currency: currency || 'CNY',
          method: method || null,
          reference: reference || null,
          note: note || null,
          periodStart: start,
          periodEnd: end,
          recordedById: user.id,
        },
      })
      await tx.organization.update({
        where: { id: organizationId },
        // A paid organization is by definition no longer on trial.
        data: { accessExpiresAt: end, isTrial: false },
      })
      return created
    })

    await logActivity(user.id, 'PAYMENT_RECORDED', `${org.name}: ${numericAmount} ${currency || 'CNY'} until ${end.toISOString().slice(0, 10)}`)

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('POST /api/platform/payments error:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
