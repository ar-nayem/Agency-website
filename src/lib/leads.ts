// Campaign recipients come from two places: people with portal accounts
// (User) and prospects the super developer added by hand (Lead). They are
// merged into one shape for the campaigns UI so the composer doesn't care
// which table a recipient came from.
export type LeadSource = 'ACCOUNT' | 'MANUAL' | 'IMPORT'

export interface UnifiedLead {
  /** Prefixed so a User id and a Lead id can never collide in one selection. */
  id: string
  kind: 'user' | 'lead'
  rawId: string
  name: string
  email: string
  organizationName: string | null
  role: string | null
  source: LeadSource
  marketingOptOut: boolean
  isActive: boolean
  createdAt: Date | string
}

export function userKey(id: string) {
  return `user:${id}`
}

export function leadKey(id: string) {
  return `lead:${id}`
}

// Splits the mixed selection the UI sends back into the two id lists the
// send route needs.
export function splitRecipientKeys(keys: string[]) {
  const userIds: string[] = []
  const leadIds: string[] = []
  for (const key of keys) {
    if (key.startsWith('user:')) userIds.push(key.slice(5))
    else if (key.startsWith('lead:')) leadIds.push(key.slice(5))
  }
  return { userIds, leadIds }
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

// Accepts the shapes people actually paste: one per line or comma separated,
// as "Name <a@b.com>", "Name, a@b.com, Company", or a bare address.
export interface ParsedLead {
  name: string
  email: string
  organizationName: string | null
  country?: string | null
  website?: string | null
  phone?: string | null
  notes?: string | null
}

// Spreadsheet columns are matched by header name rather than position, so a
// file's columns can be in any order and extra columns are simply ignored.
// Several spellings map to the same field because people label these
// differently in their own sheets.
const HEADER_ALIASES: Record<keyof Omit<ParsedLead, never>, string[]> = {
  name: ['name', 'full name', 'contact', 'contact name', 'person', 'agency contact'],
  email: ['email', 'e-mail', 'email address', 'mail', 'contact email'],
  organizationName: ['company', 'organization', 'organisation', 'agency', 'company name', 'organization name', 'business'],
  country: ['country', 'location', 'region'],
  website: ['website', 'web', 'url', 'site', 'web site'],
  phone: ['phone', 'mobile', 'tel', 'telephone', 'contact number', 'whatsapp'],
  notes: ['notes', 'note', 'comment', 'comments', 'remark', 'remarks'],
}

function normaliseHeader(h: string) {
  return h.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

/** Maps a sheet's header row to field names; unknown columns map to null. */
export function mapHeaders(headers: string[]): (keyof ParsedLead | null)[] {
  return headers.map((raw) => {
    const h = normaliseHeader(String(raw ?? ''))
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(h)) return field as keyof ParsedLead
    }
    return null
  })
}

export interface SheetParseResult {
  leads: ParsedLead[]
  invalid: string[]
  /** True when no column could be identified as the email column. */
  missingEmailColumn: boolean
}

// Takes rows already read off a sheet (first row = headers) and turns them
// into leads. Rows without a usable email are reported rather than dropped
// silently, so a mis-mapped file is obvious instead of half-importing.
export function parseLeadRows(rows: unknown[][]): SheetParseResult {
  const invalid: string[] = []
  const leads: ParsedLead[] = []
  const seen = new Set<string>()

  if (rows.length === 0) return { leads, invalid, missingEmailColumn: true }

  const headerRow = (rows[0] || []).map((c) => String(c ?? ''))
  const mapped = mapHeaders(headerRow)
  if (!mapped.includes('email')) return { leads, invalid, missingEmailColumn: true }

  for (const row of rows.slice(1)) {
    if (!row || row.every((c) => String(c ?? '').trim() === '')) continue

    const rec: Partial<Record<keyof ParsedLead, string>> = {}
    mapped.forEach((field, i) => {
      if (!field) return
      const value = String(row[i] ?? '').trim()
      if (value) rec[field] = value
    })

    const email = rec.email ? normaliseEmail(rec.email) : ''
    if (!email || !isValidEmail(email)) {
      invalid.push(row.map((c) => String(c ?? '')).filter(Boolean).join(', ') || '(blank row)')
      continue
    }
    if (seen.has(email)) continue
    seen.add(email)

    leads.push({
      name: rec.name || email.split('@')[0],
      email,
      organizationName: rec.organizationName || null,
      country: rec.country || null,
      website: rec.website || null,
      phone: rec.phone || null,
      notes: rec.notes || null,
    })
  }

  return { leads, invalid, missingEmailColumn: false }
}

export function parseLeadList(text: string): { leads: ParsedLead[]; invalid: string[] } {
  const leads: ParsedLead[] = []
  const invalid: string[] = []
  const seen = new Set<string>()

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    let name = ''
    let email = ''
    let org: string | null = null

    // "Name <address>" — the format every mail client copies.
    const angled = line.match(/^(.*?)<([^>]+)>\s*$/)
    if (angled) {
      name = angled[1].trim().replace(/^["']|["']$/g, '')
      email = angled[2].trim()
    } else {
      const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter(Boolean)
      const emailPart = parts.find((p) => isValidEmail(p))
      if (!emailPart) {
        invalid.push(line)
        continue
      }
      email = emailPart
      const rest = parts.filter((p) => p !== emailPart)
      name = rest[0] || ''
      org = rest[1] || null
    }

    if (!isValidEmail(email)) {
      invalid.push(line)
      continue
    }
    const key = normaliseEmail(email)
    if (seen.has(key)) continue
    seen.add(key)

    // Fall back to the local part so a bare address still greets someone by
    // something, rather than leaving {{firstName}} on its fallback for all.
    leads.push({ name: name || key.split('@')[0], email: key, organizationName: org })
  }

  return { leads, invalid }
}
