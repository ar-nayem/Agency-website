import type { PortalStudentRecord } from './types'

// Connector for the "iStudy" agent platform (e.g. admission.jssc.istudyedu.com,
// a Vue SPA). Reverse-engineered from the site's own login/apply-list chunks:
// unlike AT0086 there's no client-side AES step — the frontend POSTs
// username/password as plain form data to the tenant's API host and gets a
// bearer token back. The API host is the frontend host with its "admission."
// subdomain stripped (admission.jssc.istudyedu.com -> jssc.istudyedu.com),
// which held for the one tenant this was verified against; if a future
// tenant doesn't follow that convention, login will just fail with a normal
// HTTP/JSON error rather than silently hitting the wrong host.

const ACCEPT = 'application/x.istudyerp.v1+json'

function apiBaseFrom(originUrl: string): string {
  const u = new URL(originUrl)
  const host = u.hostname.startsWith('admission.') ? u.hostname.slice('admission.'.length) : u.hostname
  return `${u.protocol}//${host}/api/agent/`
}

interface LoginResult {
  success: boolean
  message?: string
  apiBase: string
  token: string
}

async function login(baseUrl: string, username: string, password: string, fetchImpl: typeof fetch): Promise<LoginResult> {
  const apiBase = apiBaseFrom(baseUrl)
  const res = await fetchImpl(`${apiBase}login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: ACCEPT,
    },
    body: new URLSearchParams({ username, password }).toString(),
  })
  const json = await res.json().catch(() => null)
  if (!json || json.code !== 200 || !json.data?.token) {
    return { success: false, message: json?.message || `Login failed (HTTP ${res.status})`, apiBase, token: '' }
  }
  return { success: true, apiBase, token: json.data.token }
}

async function fetchAllStudents(apiBase: string, token: string, fetchImpl: typeof fetch): Promise<PortalStudentRecord[]> {
  const limit = 100
  let page = 1
  let totalPages = 1
  const results: PortalStudentRecord[] = []

  do {
    const res = await fetchImpl(`${apiBase}applies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: ACCEPT,
        Authorization: token,
      },
      body: new URLSearchParams({
        number: '',
        name: '',
        passport_number: '',
        country_id: '',
        applystatus_id: '',
        page: String(page),
        limit: String(limit),
      }).toString(),
    })
    const json = await res.json().catch(() => null)
    if (!json || json.code !== 200) {
      throw new Error(json?.message || `Failed to list applications (HTTP ${res.status})`)
    }

    const rows: any[] = json.data || []
    totalPages = json.total_pages || 1

    for (const row of rows) {
      results.push({
        externalId: String(row.id),
        passportNo: row.passport_number || null,
        passportName: row.name || null,
        program: row.major || null,
        applyStatus: row.applystatus || null,
        admitStatus: null,
        appliedAt: null,
        raw: row,
      })
    }

    if (rows.length === 0) break
    page += 1
  } while (page <= totalPages)

  return results
}

export async function scanPortal(baseUrl: string, username: string, password: string, fetchImpl: typeof fetch = fetch): Promise<PortalStudentRecord[]> {
  const loginResult = await login(baseUrl, username, password, fetchImpl)
  if (!loginResult.success) {
    throw new Error(loginResult.message || 'Login failed')
  }
  return fetchAllStudents(loginResult.apiBase, loginResult.token, fetchImpl)
}
