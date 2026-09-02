export const dynamic = 'force-dynamic'

import { getEffectiveUser } from '@/src/lib/session'
import { SUPER_DEVELOPER } from '@/src/lib/roles'
import { NextRequest, NextResponse } from 'next/server'

// A blank CSV with exactly the headers the importer recognises, plus one
// example row so the expected shape is obvious. Served as CSV rather than
// Excel so it opens in anything.
export async function GET(req: NextRequest) {
  const user = await getEffectiveUser(req)
  if (!user || user.actualRole !== SUPER_DEVELOPER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = [
    ['Name', 'Country', 'Website', 'Email', 'Company', 'Phone', 'Notes'],
    ['Ayesha Rahman', 'Bangladesh', 'https://dhakastudy.com', 'ayesha@dhakastudy.com', 'Dhaka Study Abroad', '+8801700000000', 'Met at the education fair'],
  ]
  // Quote every cell and double any inner quotes — Notes routinely contains
  // commas, which would otherwise shift each following column by one.
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')

  return new NextResponse('﻿' + csv, {
    headers: {
      // The BOM keeps non-ASCII names readable when the file is opened in Excel.
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads-template.csv"',
    },
  })
}
