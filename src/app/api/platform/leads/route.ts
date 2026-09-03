export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER, DELETED } from '@/src/lib/roles'
import { logActivity } from '@/src/lib/activity'
import { normaliseEmail, isValidEmail, parseLeadList, userKey, leadKey, type UnifiedLead } from '@/src/lib/leads'
import { NextRequest, NextResponse } from 'next/server'

// Two sources in one list: everyone with a portal account across every org,
// plus prospects added by hand. The campaigns UI treats them identically.
export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [users, leads, sentRecipients] = await Promise.all([
      prisma.user.findMany({
        where: { role: { not: DELETED } },
        select: {
          id: true, name: true, email: true, role: true, isActive: true,
          marketingOptOut: true, createdAt: true,
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }),
      // Only SENT counts as contacted — a failed or pending delivery means
      // the person never actually heard from us, and should stay in the
      // "not yet contacted" pool rather than being quietly skipped forever.
      prisma.campaignRecipient.findMany({
        where: { status: 'SENT' },
        select: { email: true, sentAt: true },
      }),
    ])

    // Keyed on the lowercased address so it matches regardless of how the
    // address was capitalised when the campaign was sent.
    const contact = new Map<string, { count: number; last: Date | null }>()
    for (const r of sentRecipients) {
      const key = normaliseEmail(r.email)
      const prev = contact.get(key) || { count: 0, last: null }
      contact.set(key, {
        count: prev.count + 1,
        last: !prev.last || (r.sentAt && r.sentAt > prev.last) ? r.sentAt ?? prev.last : prev.last,
      })
    }
    const historyFor = (email: string) => contact.get(normaliseEmail(email)) || { count: 0, last: null }

    const fromAccounts: UnifiedLead[] = users.map((u) => ({
      id: userKey(u.id),
      kind: 'user',
      rawId: u.id,
      name: u.name,
      email: u.email,
      organizationName: u.organization?.name ?? null,
      role: u.role,
      source: 'ACCOUNT',
      marketingOptOut: u.marketingOptOut,
      isActive: u.isActive,
      createdAt: u.createdAt,
      timesContacted: historyFor(u.email).count,
      lastContactedAt: historyFor(u.email).last,
    }))

    const fromManual: UnifiedLead[] = leads.map((l) => ({
      id: leadKey(l.id),
      kind: 'lead',
      rawId: l.id,
      name: l.name,
      email: l.email,
      organizationName: l.organizationName,
      role: null,
      source: l.source === 'IMPORT' ? 'IMPORT' : 'MANUAL',
      marketingOptOut: l.marketingOptOut,
      isActive: true,
      createdAt: l.createdAt,
      timesContacted: historyFor(l.email).count,
      lastContactedAt: historyFor(l.email).last,
    }))

    // An address that already has an account is dropped from the manual side:
    // the account row carries more (role, org, active state), and keeping both
    // would let one person be selected twice and emailed twice.
    const accountEmails = new Set(users.map((u) => normaliseEmail(u.email)))
    const merged = [...fromAccounts, ...fromManual.filter((l) => !accountEmails.has(normaliseEmail(l.email)))]

    return NextResponse.json(merged)
  } catch (error) {
    console.error('GET /api/platform/leads error:', error)
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 })
  }
}

// Adds one prospect, or many at once when `bulk` text is supplied.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    if (typeof body.bulk === 'string' && body.bulk.trim()) {
      const { leads, invalid } = parseLeadList(body.bulk)
      if (leads.length === 0) {
        return NextResponse.json({ error: 'No valid email addresses found', invalid }, { status: 400 })
      }

      // Duplicates are filtered before insert rather than relying on
      // createMany's skipDuplicates, which SQLite doesn't support. Re-pasting
      // an overlapping list is the normal way these get built up, so it has
      // to be harmless.
      const emails = leads.map((l) => l.email)
      const [existingLeads, existingAccounts] = await Promise.all([
        prisma.lead.findMany({ where: { email: { in: emails } }, select: { email: true } }),
        prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
      ])
      const taken = new Set([
        ...existingLeads.map((l) => l.email.toLowerCase()),
        ...existingAccounts.map((u) => u.email.toLowerCase()),
      ])
      const fresh = leads.filter((l) => !taken.has(l.email))

      if (fresh.length > 0) {
        await prisma.lead.createMany({
          data: fresh.map((l) => ({
            name: l.name,
            email: l.email,
            organizationName: l.organizationName,
            source: 'IMPORT',
          })),
        })
      }

      await logActivity(user.id, 'LEADS_IMPORTED', `${fresh.length} added`)
      return NextResponse.json({
        added: fresh.length,
        skipped: leads.length - fresh.length,
        invalid,
      }, { status: 201 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const normalised = normaliseEmail(email)
    const existingAccount = await prisma.user.findFirst({ where: { email: { equals: normalised } }, select: { id: true } })
    if (existingAccount) {
      return NextResponse.json({ error: 'That address already has a portal account and is already in this list' }, { status: 400 })
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email: normalised,
        organizationName: body.organizationName?.trim() || null,
        phone: body.phone?.trim() || null,
        country: body.country?.trim() || null,
        notes: body.notes?.trim() || null,
        source: 'MANUAL',
      },
    })

    await logActivity(user.id, 'LEAD_ADDED', `${lead.name} <${lead.email}>`)
    return NextResponse.json(lead, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'That email is already in your leads' }, { status: 400 })
    }
    console.error('POST /api/platform/leads error:', error)
    return NextResponse.json({ error: 'Failed to add lead' }, { status: 500 })
  }
}
