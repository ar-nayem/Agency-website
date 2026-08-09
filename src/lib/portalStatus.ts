// Maps a portal's raw AdmitStatus code to one of the buckets an agent
// actually cares about. This platform doesn't document the enum anywhere,
// so every entry below was confirmed one student at a time against a
// portal's own rendered label.
//
// IMPORTANT: codes are NOT standardized across AT0086 tenants. Each
// university configured its own custom status list independently on the
// shared platform software — confirmed 2026-08-09 when code 5 turned out
// to mean "Pre-admission" at Heze but "Revoked" at Hunan Institution for
// the same underlying digit. Only 1/3/4/7 (Pending/Accepted/Rejected/
// Revoked) are treated as a shared base, since they're the small,
// structurally "core" codes and no divergence has been found in them —
// everything else requires a per-portal override, confirmed individually,
// or it safely falls back to the generic "Processing" bucket rather than
// guessing. If 1/3/4/7 are ever caught diverging too, move them into
// PORTAL_OVERRIDES the same way.
export type StatusCategory = 'UNSUBMITTED' | 'PENDING' | 'PROCESSING' | 'PREADMISSION' | 'ACCEPTED' | 'REJECTED' | 'REVOKED'

const GLOBAL_KNOWN: Record<string, StatusCategory> = {
  '1': 'PENDING',
  '3': 'ACCEPTED',
  '4': 'REJECTED',
  '7': 'REVOKED',
}

// Portal IDs from the live UniversityPortal table — named here for
// readability since the map below is meaningless without knowing which
// university each override belongs to.
const HEZE = '1dc07be8-6a1d-4858-bd52-03b7b8f58de2'
const HUNAN = '1c5a4e3b-f83a-44e3-a230-eaf92648da70'
const WUHAN_FOREIGN = '735aaffe-767b-458f-8839-71709a6b94de'

const PORTAL_OVERRIDES: Record<string, Record<string, StatusCategory>> = {
  [HEZE]: { '5': 'PREADMISSION', '22': 'PREADMISSION' },
  [HUNAN]: { '5': 'REVOKED' },
  [WUHAN_FOREIGN]: { '0': 'UNSUBMITTED' },
}

export function categorizeAdmitStatus(code: string | null | undefined, portalId?: string): StatusCategory {
  // No admitStatus set yet means the application hasn't reached an admission
  // decision stage at all — i.e. not submitted for admission review, not "unknown".
  if (code == null || code === '') return 'UNSUBMITTED'
  const override = portalId ? PORTAL_OVERRIDES[portalId]?.[code] : undefined
  if (override) return override
  return GLOBAL_KNOWN[code] || 'PROCESSING'
}

export const CATEGORY_LABELS: Record<StatusCategory, string> = {
  UNSUBMITTED: 'Unsubmitted',
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PREADMISSION: 'Pre-admission',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
}

export const STATUS_CATEGORIES: StatusCategory[] = ['UNSUBMITTED', 'PENDING', 'PROCESSING', 'PREADMISSION', 'ACCEPTED', 'REJECTED', 'REVOKED']
