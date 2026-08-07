// Lightweight User-Agent parsing — good enough for an internal analytics
// dashboard, not aiming for the precision of a full library like ua-parser-js.
export function parseBrowser(ua: string | null | undefined): string {
  if (!ua) return 'Unknown'
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'
  return 'Other'
}

export function parseOS(ua: string | null | undefined): string {
  if (!ua) return 'Unknown'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Mac OS X/.test(ua)) return 'macOS'
  if (/Android/.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Other'
}

export function parseDeviceType(ua: string | null | undefined): 'Mobile' | 'Tablet' | 'Desktop' {
  if (!ua) return 'Desktop'
  if (/iPad|Tablet/.test(ua)) return 'Tablet'
  if (/Mobile|iPhone|Android/.test(ua)) return 'Mobile'
  return 'Desktop'
}
