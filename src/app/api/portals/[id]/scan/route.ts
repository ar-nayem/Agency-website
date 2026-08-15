export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { isSameOrg } from '@/src/lib/orgScope'
import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

function isOwner(role: string | undefined) {
  return role === 'OWNER'
}

// Runs the scan as a separate process rather than importing the OCR/scraping
// logic into the Next.js server — tesseract.js spins up its own worker/WASM
// runtime that has no business living inside the request-handling process.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || !isOwner(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const portal = await prisma.universityPortal.findUnique({ where: { id } })
    if (!portal || !isSameOrg(user, portal)) return NextResponse.json({ error: 'Portal not found' }, { status: 404 })

    const cwd = path.join(process.cwd())
    try {
      const { stdout } = await execFileAsync(
        'node',
        ['--env-file=.env.local', '--import=tsx', 'scripts/portal-scan.ts', `--portalId=${id}`],
        { cwd, timeout: 120000 }
      )
      const updated = await prisma.universityPortal.findUnique({
        where: { id },
        select: { lastScanAt: true, lastScanStatus: true, lastScanError: true, lastScanCount: true },
      })
      return NextResponse.json({ success: true, log: stdout, ...updated })
    } catch (execErr: any) {
      const updated = await prisma.universityPortal.findUnique({
        where: { id },
        select: { lastScanAt: true, lastScanStatus: true, lastScanError: true, lastScanCount: true },
      })
      return NextResponse.json(
        { success: false, error: execErr?.message || 'Scan failed', ...updated },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('POST /api/portals/[id]/scan error:', error)
    return NextResponse.json({ error: 'Failed to run scan' }, { status: 500 })
  }
}
