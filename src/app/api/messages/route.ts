export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getSessionUser } from '@/src/lib/session'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const withUserId = searchParams.get('with')
    const studentId = searchParams.get('studentId')

    if (withUserId) {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: withUserId },
            { senderId: withUserId, receiverId: user.id },
          ],
          ...(studentId ? { studentId } : {}),
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          receiver: { select: { id: true, name: true, role: true } },
          student: { select: { id: true, fullName: true, serialNumber: true } },
        },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json(messages)
    }

    // Get conversation list
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
        student: { select: { id: true, fullName: true, serialNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by conversation partner
    const conversations = new Map()
    for (const msg of messages) {
      const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId
      const key = studentId ? `${partnerId}-${msg.studentId || 'general'}` : partnerId
      if (!conversations.has(key)) {
        conversations.set(key, {
          partner: msg.senderId === user.id ? msg.receiver : msg.sender,
          student: msg.student,
          lastMessage: msg,
          unreadCount: msg.receiverId === user.id && !msg.isRead ? 1 : 0,
        })
      } else if (msg.receiverId === user.id && !msg.isRead) {
        conversations.get(key).unreadCount++
      }
    }

    return NextResponse.json(Array.from(conversations.values()))
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { receiverId, content, studentId } = body

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (user.role === 'AGENT') {
      const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { role: true } })
      if (!receiver || (receiver.role !== 'ADMIN' && receiver.role !== 'OWNER')) {
        return NextResponse.json({ error: 'Agents can only message admins' }, { status: 403 })
      }
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: user.id,
        receiverId,
        studentId: studentId || null,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } },
        student: { select: { id: true, fullName: true, serialNumber: true } },
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
