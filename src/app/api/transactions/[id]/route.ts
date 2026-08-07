export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'
import { TRANSACTION_CATEGORIES, PAYMENT_METHODS, TRANSACTION_STATUSES } from '@/src/lib/money'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    if (!isAdminRole(user.role) && existing.createdById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data: any = {}

    if (body.type !== undefined) {
      if (body.type !== 'INCOME' && body.type !== 'EXPENSE') {
        return NextResponse.json({ error: 'type must be INCOME or EXPENSE' }, { status: 400 })
      }
      data.type = body.type
    }
    if (body.category !== undefined) {
      if (!TRANSACTION_CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      data.category = body.category
    }
    if (body.amount !== undefined) {
      const amountNum = Number(body.amount)
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
      }
      data.amount = amountNum
    }
    if (body.currency !== undefined) data.currency = body.currency
    if (body.paymentMethod !== undefined) {
      if (body.paymentMethod && !PAYMENT_METHODS.includes(body.paymentMethod)) {
        return NextResponse.json({ error: 'Invalid paymentMethod' }, { status: 400 })
      }
      data.paymentMethod = body.paymentMethod || null
    }
    if (body.status !== undefined) {
      if (!TRANSACTION_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = body.status
    }
    if (body.description !== undefined) data.description = body.description || null
    if (body.transactionDate !== undefined) data.transactionDate = new Date(body.transactionDate)

    const transaction = await prisma.transaction.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, fullName: true, serialNumber: true } },
        agent: { select: { id: true, name: true } },
      },
    })

    await logActivity(user.id, 'TRANSACTION_UPDATED', `${transaction.currency} ${transaction.amount} (${transaction.category}) for ${transaction.student.fullName}`)

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('PATCH /api/transactions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { student: { select: { fullName: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

    if (!isAdminRole(user.role) && existing.createdById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.transaction.delete({ where: { id } })
    await logActivity(user.id, 'TRANSACTION_DELETED', `${existing.type} ${existing.currency} ${existing.amount} (${existing.category}) for ${existing.student.fullName}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/transactions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
