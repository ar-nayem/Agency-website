// Maps a portal's raw AdmitStatus code to one of the buckets an agent
// actually cares about. Every code below was confirmed one student at a
// time against the live portal's own rendered label, across every AT0086
// portal configured as of 2026-08-09 (Heze, Hunan, Sichuan Tourism,
// Changsha, Wuhan Foreign, Jinning, Jinan) — this platform doesn't
// document the enum anywhere, and different raw codes can render as the
// same label (both 5 and 22 are "Pre-admission"; 0 is "Un-submitted", not
// "Processing" like an unmapped code would fall back to). 206 and 21 were
// checked too and are genuinely "Processing" per the portal's own label.
// If a newly-added portal uses different codes for the same concepts,
// this may need a per-portal override — for now every portal observed
// shares one scheme, so a single shared mapping is correct.
export type StatusCategory = 'UNSUBMITTED' | 'PENDING' | 'PROCESSING' | 'PREADMISSION' | 'ACCEPTED' | 'REJECTED' | 'REVOKED'

const KNOWN: Record<string, StatusCategory> = {
  '0': 'UNSUBMITTED',
  '1': 'PENDING',
  '5': 'PREADMISSION',
  '22': 'PREADMISSION',
  '3': 'ACCEPTED',
  '4': 'REJECTED',
  '7': 'REVOKED',
}

export function categorizeAdmitStatus(code: string | null | undefined): StatusCategory {
  // No admitStatus set yet means the application hasn't reached an admission
  // decision stage at all — i.e. not submitted for admission review, not "unknown".
  if (code == null || code === '') return 'UNSUBMITTED'
  return KNOWN[code] || 'PROCESSING'
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
