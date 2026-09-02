export const dynamic = 'force-dynamic'

import { prisma } from '@/src/lib/prisma'
import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { logActivity } from '@/src/lib/activity'
import { parseLeadRows } from '@/src/lib/leads'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Accepts a spreadsheet upload (.csv/.xlsx/.xls) and maps its columns by
// header name. XLSX reads all three formats, which avoids hand-rolling CSV
// quoting rules — a Notes column containing a comma is the normal case, and
// a naive split would corrupt every row after it.
export async function POST(req: NextRequest) {
  try {
    const user = await getEffectiveUser(req)
    if (!user || user.actualRole !== SUPER_DEVELOPER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File is too large (5MB maximum)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let rows: unknown[][]
    try {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) return NextResponse.json({ error: 'That file has no readable sheet' }, { status: 400 })
      // header:1 gives raw rows so the header row can be mapped by name;
      // blank cells are kept as '' so column positions stay aligned.
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })
    } catch {
      return NextResponse.json({ error: 'Could not read that file. Save it as CSV or Excel and try again.' }, { status: 400 })
    }

    const { leads, invalid, missingEmailColumn } = parseLeadRows(rows)
    if (missingEmailColumn) {
      return NextResponse.json(
        { error: 'No Email column found. The first row must be a header row containing a column named Email.' },
        { status: 400 }
      )
    }
    if (leads.length === 0) {
      return NextResponse.json({ error: 'No rows with a valid email address were found', invalid }, { status: 400 })
    }

    // Skip anything already present on either side, so re-uploading an
    // updated version of the same sheet is safe.
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
          country: l.country ?? null,
          website: l.website ?? null,
          phone: l.phone ?? null,
          notes: l.notes ?? null,
          source: 'IMPORT',
        })),
      })
    }

    await logActivity(user.id, 'LEADS_IMPORTED', `${fresh.length} from ${file.name}`)

    return NextResponse.json({
      added: fresh.length,
      skipped: leads.length - fresh.length,
      invalid,
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/platform/leads/import error:', error)
    return NextResponse.json({ error: 'Failed to import leads' }, { status: 500 })
  }
}
