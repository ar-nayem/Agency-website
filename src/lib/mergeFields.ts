// Per-recipient placeholders for campaign subjects and bodies. Substituted
// at send time from the CampaignRecipient row, which snapshots each lead's
// name/email/org when the campaign is created — so a send stays faithful to
// who the audience was that day, even if someone later renames their
// organization or leaves it.
export interface MergeFieldDef {
  token: string
  label: string
  /** Shown when the recipient has no value for it. */
  fallback: string
}

export const MERGE_FIELDS: MergeFieldDef[] = [
  { token: '{{firstName}}', label: 'First name', fallback: 'there' },
  { token: '{{name}}', label: 'Full name', fallback: 'there' },
  { token: '{{organization}}', label: 'Company name', fallback: 'your agency' },
  { token: '{{email}}', label: 'Email address', fallback: '' },
]

export interface MergeRecipient {
  name?: string | null
  email?: string | null
  orgName?: string | null
}

// A fallback is used whenever the value is missing OR blank, so a recipient
// row with an empty-string name still reads "Hi there," rather than "Hi ,".
function valueFor(token: string, r: MergeRecipient): string {
  const name = (r.name || '').trim()
  switch (token) {
    case '{{firstName}}':
      return name.split(/\s+/)[0] || ''
    case '{{name}}':
      return name
    case '{{organization}}':
      return (r.orgName || '').trim()
    case '{{email}}':
      return (r.email || '').trim()
    default:
      return ''
  }
}

export function applyMergeFields(text: string, recipient: MergeRecipient): string {
  let out = text
  for (const field of MERGE_FIELDS) {
    const value = valueFor(field.token, recipient) || field.fallback
    // Split/join rather than a regex: the token is a literal string, and a
    // value containing $& or $1 would otherwise be mangled by replace()'s
    // substitution patterns.
    out = out.split(field.token).join(value)
  }
  return out
}
