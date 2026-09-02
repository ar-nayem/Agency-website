export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, agentSignupTemplate } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'
import { parseFeatures } from '@/src/lib/features'

// An org whose package excludes the Agent Invite Link can't be joined through
// one — its existing code stops resolving, exactly like a regenerated or
// suspended-org code, so a held link reveals nothing about why it stopped.
function orgAllowsInvite(org: { package: { features: string } | null }) {
  return !org.package || parseFeatures(org.package.features).includes('agent_invite_link')
}

// Public — lets the register page confirm an invite code is real (and show
// which organization the visitor is about to join) before they fill out the form.
export async function GET(req: NextRequest) {
  try {
    const code = new URL(req.url).searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 })

    const org = await prisma.organization.findUnique({
      where: { inviteCode: code },
      select: { name: true, status: true, package: { select: { features: true } } },
    })
    if (!org || org.status !== 'ACTIVE' || !orgAllowsInvite(org)) {
      return NextResponse.json({ error: 'This invite link is invalid or no longer active' }, { status: 404 })
    }

    return NextResponse.json({ organizationName: org.name })
  } catch (error) {
    console.error('GET /api/auth/register error:', error)
    return NextResponse.json({ error: 'Failed to check invite link' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, phone, code } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'A valid invite link is required to sign up' }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { inviteCode: code },
      include: { package: { select: { features: true } } },
    })
    if (!org || org.status !== 'ACTIVE' || !orgAllowsInvite(org)) {
      return NextResponse.json({ error: 'This invite link is invalid or no longer active' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 })
    }

    const hashed = await hash(password, 12)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        password: hashed,
        phone: phone || null,
        role: 'AGENT',
        organizationId: org.id,
        // Self-registered agents get real access to student PII once active —
        // start inactive so that org's owner reviews and approves via the Agents page.
        isActive: false,
      },
      select: { id: true, name: true, email: true },
    })

    await logActivity(newUser.id, 'ACCOUNT_REGISTERED', `${newUser.name} self-registered as agent via invite link, pending approval`)
    await sendNotification('New Agent Signup — Approval Needed', agentSignupTemplate(newUser.name, newUser.email), org.id)

    return NextResponse.json({ message: 'Account created. An admin will review and activate it shortly.' }, { status: 201 })
  } catch (error) {
    console.error('POST /api/auth/register error:', error)
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}
