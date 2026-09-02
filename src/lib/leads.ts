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
