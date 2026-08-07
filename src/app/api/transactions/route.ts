export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser, isAdminRole } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/src/lib/activity'
import { TRANSACTION_CATEGORIES, PAYMENT_METHODS, TRANSACTION_STATUSES } from '@/src/lib/money'

async function scopeWhere(user: { id: string; role: string }, searchParams: URLSearchParams) {
  const where: any = {}
  const agentId = searchParams.get('agentId')

  if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
    where.agentId = user.id
  } else if (user.role === 'ADMIN') {
    const managed = await prisma.user.findMany({ where: { managedByAdminId: user.id }, select: { id: true } })
    const allowedIds = managed.length > 0 ? [...managed.map(m => m.id), user.id] : null
    if (agentId) {
      where.agentId = allowedIds && !allowedIds.includes(agentId) ? '__none__' : agentId
    } else if (allowedIds) {
      where.agentId = { in: allowedIds }
    }
  } else if (agentId) {
    where.agentId = agentId
  }

  const studentId = searchParams.get('studentId')
  if (studentId) where.studentId = studentId

  const type = searchParams.get('type')
  if (type) where.type = type

  const category = searchParams.get('category')
  if (category) where.category = category

  const status = searchParams.get('status')
  if (status) where.status = status

  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  if (dateFrom || dateTo) {
    where.transactionDate = {}
    if (dateFrom) where.transactionDate.gte = new Date(dateFrom)
    if (dateTo) where.transactionDate.lte = new Date(dateTo + 'T23:59:59.999Z')
  }

  const search = searchParams.get('search')
  if (search) {
    where.OR = [
      { description: { contains: search } },
      { category: { contains: search } },
      { student: { fullName: { contains: search } } },
    ]
  }

  return where
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const where = await scopeWhere(user, searchParams)

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, serialNumber: true, status: true } },
        agent: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { transactionDate: 'desc' },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('GET /api/transactions error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { studentId, type, category, amount, currency, paymentMethod, status, description, transactionDate } = body

    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }
    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return NextResponse.json({ error: 'type must be INCOME or EXPENSE' }, { status: 400 })
    }
    if (!category || !TRANSACTION_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid paymentMethod' }, { status: 400 })
    }
    if (status && !TRANSACTION_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    if (!isAdminRole(user.role) && student.agentId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        studentId,
        agentId: student.agentId,
        createdById: user.id,
        type,
        category,
        amount: amountNum,
        currency: currency || 'CNY',
        paymentMethod: paymentMethod || null,
        status: status || 'COMPLETED',
        description: description || null,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      },
      include: {
        student: { select: { id: true, fullName: true, serialNumber: true } },
        agent: { select: { id: true, name: true } },
      },
    })

    await logActivity(
      user.id,
      'TRANSACTION_CREATED',
      `${type} ${transaction.currency} ${amountNum} (${category}) for ${transaction.student.fullName}`
    )

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('POST /api/transactions error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
