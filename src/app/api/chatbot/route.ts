export const dynamic = 'force-dynamic'

import { getEffectiveUser } from '@/src/lib/session'
import { getChatbotReply } from '@/src/lib/chatbot'
import { NextRequest, NextResponse } from 'next/server'

// Public endpoint — a logged-out visitor on /login can ask about offers.
// If a session cookie is present, getEffectiveUser resolves it (including
// organizationId) and the reply engine unlocks student-status lookups scoped
// to that user's own org and students.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = typeof body.message === 'string' ? body.message.slice(0, 500) : ''
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const user = await getEffectiveUser(req)
    const result = await getChatbotReply(message, user)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Chatbot POST error:', error)
    return NextResponse.json({ error: 'Failed to get a reply' }, { status: 500 })
  }
}
