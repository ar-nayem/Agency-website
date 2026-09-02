export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER, DELETED } from '@/src/lib/roles'
import { sendMail } from '@/src/lib/email'
import { unsubscribeToken } from '@/src/lib/campaignToken'
import { applyMergeFields } from '@/src/lib/mergeFields'
import { logActivity } from '@/src/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, subject: true, audience: true, status: true,
        totalCount: true, sentCount: true, failedCount: true,
        createdAt: true, completedAt: true,
        createdBy: { select: { name: true } },
      },
    })
    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('GET /api/platform/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 })
  }
}

// Kicks off the send in the background and returns immediately — a batch of
// a few hundred emails sent one-by-one over SMTP would otherwise blow past
// nginx's proxy_read_timeout on the request. The client polls GET /[id] for
// progress. Safe because this app runs as a persistent pm2 process, not a
// serverless function that gets frozen after the response is sent.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { subject, html, recipientIds } = await req.json()
    if (!subject?.trim() || !html?.trim() || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json({ error: 'subject, html and at least one recipient are required' }, { status: 400 })
    }

    const leads = await prisma.user.findMany({
      where: { id: { in: recipientIds }, role: { not: DELETED }, isActive: true, marketingOptOut: false },
      select: { id: true, name: true, email: true, organization: { select: { name: true } } },
    })

    if (leads.length === 0) {
      return NextResponse.json({ error: 'None of the selected recipients are eligible (inactive or unsubscribed)' }, { status: 400 })
    }

    // Dedupe by email — the same person can't get the campaign twice even
    // if somehow selected via two rows.
    const seen = new Set<string>()
    const uniqueLeads = leads.filter((l) => {
      const key = l.email.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const origin = req.nextUrl.origin

    const campaign = await prisma.campaign.create({
      data: {
        subject: subject.trim(),
        body: html,
        audience: `${uniqueLeads.length} selected`,
        status: 'SENDING',
        totalCount: uniqueLeads.length,
        createdById: user.id,
        recipients: {
          create: uniqueLeads.map((l) => ({
            email: l.email,
            name: l.name,
            orgName: l.organization?.name ?? null,
          })),
        },
      },
    })

    await logActivity(user.id, 'CAMPAIGN_STARTED', `${subject.trim()} → ${uniqueLeads.length} recipients`)

    sendCampaignInBackground(campaign.id, subject.trim(), html, origin)

    return NextResponse.json({ id: campaign.id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/platform/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 })
  }
}

async function sendCampaignInBackground(campaignId: string, subject: string, html: string, origin: string) {
  const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId } })

  let sentCount = 0
  let failedCount = 0

  for (const recipient of recipients) {
    const token = unsubscribeToken(recipient.email)
    const unsubscribeUrl = `${origin}/api/public/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${token}`
    // Personalised per recipient from their snapshotted name/org — subject
    // included, since that's what decides whether the mail gets opened.
    const personalSubject = applyMergeFields(subject, recipient)
    const personalHtml = applyMergeFields(html, recipient)
    const fullHtml = `
      ${personalHtml}
      <hr style="margin-top:32px;border:none;border-top:1px solid #e5e7eb" />
      <p style="font-size:11px;color:#9ca3af;margin-top:12px">
        You're receiving this because you have an account on this platform.
        <a href="${unsubscribeUrl}" style="color:#9ca3af">Unsubscribe</a>
      </p>
    `

    try {
      await sendMail(recipient.email, personalSubject, fullHtml)
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'SENT', sentAt: new Date() },
      })
      sentCount++
    } catch (error: any) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'FAILED', error: String(error?.message || error) },
      })
      failedCount++
    }

    // Small pacing gap so a burst of a few hundred sends doesn't look like
    // spam to the SMTP provider and trip its rate limiting.
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: failedCount > 0 && sentCount === 0 ? 'FAILED' : 'SENT',
      sentCount,
      failedCount,
      completedAt: new Date(),
    },
  })
}
