export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// A 1x1 transparent GIF, inlined so no file has to be read from disk.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

// Open tracking. Deliberately permissive: any failure still returns the
// pixel, because a broken analytics write must never leave a visible broken
// image in someone's inbox.
//
// What these numbers mean, and don't:
//   · Apple Mail Privacy Protection and Gmail's image proxy fetch images
//     ahead of the reader, so some "opens" are machines, not people.
//   · Many clients block remote images by default, so a real read can go
//     unrecorded entirely.
// Treat the count as a floor on interest, never an exact readership figure.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const respond = () =>
    new NextResponse(PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        // Without this, a proxy caching the pixel would hide every open
        // after the first.
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
      },
    })

  try {
    const { id } = await params
    const now = new Date()

    // updateMany rather than update: an unknown or already-deleted id should
    // silently do nothing instead of throwing on a public endpoint.
    await prisma.campaignRecipient.updateMany({
      where: { id, openedAt: null },
      data: { openedAt: now },
    })
    await prisma.campaignRecipient.updateMany({
      where: { id },
      data: { lastOpenedAt: now, openCount: { increment: 1 } },
    })
  } catch (error) {
    console.error('Open-tracking pixel error:', error)
  }

  return respond()
}
