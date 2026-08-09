// Maps a portal's raw AdmitStatus code to one of 5 buckets an agent actually
// cares about. Derived empirically from Heze University (the only AT0086
// portal configured so far) by cross-checking numeric codes against the
// live portal's own rendered labels — this platform doesn't document the
// enum anywhere, and different raw codes can render as the same label
// (e.g. both 2 and 203 show as "Processing"). If another portal on this
// platform uses different codes for the same concepts, this may need a
// per-portal override — there's exactly one portal today, so a single
// shared mapping is the right amount of engineering for now.
export type StatusCategory = 'UNSUBMITTED' | 'PENDING' | 'PROCESSING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED'

const KNOWN: Record<string, StatusCategory> = {
  '1': 'PENDING',
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
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
}

export const STATUS_CATEGORIES: StatusCategory[] = ['UNSUBMITTED', 'PENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'REVOKED']
