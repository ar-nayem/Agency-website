export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { verifyUnsubscribeToken } from '@/src/lib/campaignToken'
import { NextRequest, NextResponse } from 'next/server'

function page(message: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8" /><title>Unsubscribe</title>
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;color:#111827}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px 40px;text-align:center;max-width:400px}</style>
    </head><body><div class="card"><p>${message}</p></div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// No login required — this is the link recipients click from their inbox.
// Token is a stateless HMAC of the email (see campaignToken.ts), so there's
// nothing to look up before verifying it.
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || ''
  const token = req.nextUrl.searchParams.get('token') || ''

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return page('This unsubscribe link is invalid or has expired.')
  }

  try {
    // Opt out on both sides: a recipient may be a portal account holder, a
    // manually added prospect, or (after signing up) both. User.email is
    // stored as typed at signup while Lead.email is lowercased on write, so
    // each is matched in its own form. The token check above already
    // guarantees this address was the real recipient.
    await Promise.all([
      prisma.user.updateMany({
        where: { email: email.trim() },
        data: { marketingOptOut: true },
      }),
      prisma.lead.updateMany({
        where: { email: email.trim().toLowerCase() },
        data: { marketingOptOut: true },
      }),
    ])
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return page('Something went wrong. Please try again later.')
  }

  return page(`You've been unsubscribed from marketing emails.`)
}
