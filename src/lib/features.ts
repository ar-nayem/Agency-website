// The full list of gateable capabilities a Package can include/exclude.
// Adding a new gateable feature to the app means adding an entry here (and
// wiring the corresponding guard where it's enforced) — no schema change,
// since Package.features is stored as a JSON array of these keys.
export interface FeatureDef {
  key: string
  label: string
  group: string
}

export const FEATURES: FeatureDef[] = [
  { key: 'finance', label: 'Finance', group: 'Core' },
  { key: 'tasks', label: 'Tasks', group: 'Core' },
  { key: 'offers', label: 'Offers', group: 'Core' },
  { key: 'universities', label: 'Universities', group: 'Core' },
  { key: 'university_portals', label: 'University Portal Scanning', group: 'Core' },
  { key: 'manage_accounts', label: 'Manage Accounts', group: 'Admin' },
  { key: 'document_requirements', label: 'Document Requirements', group: 'Admin' },
  { key: 'field_requirements', label: 'Field Requirements', group: 'Admin' },
  { key: 'visitor_analytics', label: 'Visitor Analytics', group: 'Admin' },
  { key: 'alert_settings', label: 'Alert Settings', group: 'Admin' },
]

export const FEATURE_KEYS = FEATURES.map((f) => f.key)
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export function parseFeatures(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
