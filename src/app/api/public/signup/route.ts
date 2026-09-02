export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_DOCUMENT_REQUIREMENTS } from '@/src/lib/orgDefaults'
import { sendMail } from '@/src/lib/email'
import { logActivity } from '@/src/lib/activity'
import { TRIAL_DAYS } from '@/src/lib/trial'

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function welcomeTemplate(name: string, orgName: string, endsAt: Date, loginUrl: string) {
  return `
    <h2>Your ${TRIAL_DAYS}-day trial is ready</h2>
    <p>Hi ${name},</p>
    <p><strong>${orgName}</strong> is set up and you can sign in now.</p>
    <p><a href="${loginUrl}">${loginUrl}</a></p>
    <p>Your trial runs until <strong>${endsAt.toDateString()}</strong>. Everything you add during the
    trial stays exactly where it is if you continue afterwards — nothing is reset.</p>
    <p>Reply to this email if you need a hand getting started.</p>
  `
}

// Self-serve tenant creation from the public marketing site. Creates the
// organization and its first OWNER together, on a trial window that expires
// on its own — no manual step is needed to cut off a trial that doesn't
// convert, because getEffectiveUser locks out any org past accessExpiresAt.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : ''
    const ownerName = typeof body.ownerName === 'string' ? body.ownerName.trim() : ''
    const ownerEmail = typeof body.ownerEmail === 'string' ? body.ownerEmail.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

    if (!organizationName || !ownerName || !ownerEmail || !password) {
      return NextResponse.json({ error: 'Company name, your name, email and password are all required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: ownerEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Try signing in instead.' }, { status: 400 })
    }

    const baseSlug = slugify(organizationName) || 'org'
    let slug = baseSlug
    let suffix = 1
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`
    }

    // Whichever package is flagged as the trial tier decides what a trial
    // can actually use. If none is flagged the org gets no package, which
    // means unrestricted — deliberate, so a missing flag over-delivers
    // rather than handing someone an unusable empty portal.
    const trialPackage = await prisma.package.findFirst({
      where: { isTrialPlan: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    })

    const endsAt = new Date(Date.now() + TRIAL_DAYS * 86400000)
    const hashed = await hash(password, 12)

    const { org, owner } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          planTier: 'TRIAL',
          isTrial: true,
          accessExpiresAt: endsAt,
          packageId: trialPackage?.id ?? null,
        },
      })
      const owner = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          password: hashed,
          role: 'OWNER',
          isActive: true,
          phone: phone || null,
          organizationId: org.id,
        },
        select: { id: true, name: true, email: true },
      })
      await tx.documentRequirement.createMany({
        data: DEFAULT_DOCUMENT_REQUIREMENTS.map((d) => ({ ...d, organizationId: org.id })),
      })
      await tx.scanSettings.create({ data: { organizationId: org.id } })
      return { org, owner }
    })

    await logActivity(owner.id, 'TRIAL_SIGNUP', `${org.name} (${owner.email})`)

    const origin = new URL(req.url).origin
    // Fire-and-forget: a mail failure must not fail a signup that already
    // committed — the account works whether or not the welcome arrives.
    sendMail(owner.email, `Your ${TRIAL_DAYS}-day trial is ready`, welcomeTemplate(owner.name, org.name, endsAt, `${origin}/login`))
      .catch((err) => console.error('Trial welcome email failed:', err))

    return NextResponse.json({
      success: true,
      organizationName: org.name,
      email: owner.email,
      trialEndsAt: endsAt,
      trialDays: TRIAL_DAYS,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/public/signup error:', error)
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
  }
}
