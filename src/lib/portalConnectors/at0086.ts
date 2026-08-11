import crypto from 'crypto'
import { createWorker } from 'tesseract.js'
import type { PortalStudentRecord } from './types'

// Connector for the AT0086 (在华国际) international-student platform, used by
// many Chinese university admin portals (e.g. hezeu.at0086.cn). Reverse-engineered
// from the live site: login and list endpoints are plain AJAX (.ashx) handlers —
// no browser/JS execution needed. Every response body is AES-256-CBC encrypted
// (hex-encoded ciphertext) with a key/iv pair that's hardcoded in the tenant's own
// Common.js, so we pull it fresh per portal instead of assuming it's shared across
// tenants.

interface CookieJar { [name: string]: string }

function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

function updateJar(jar: CookieJar, res: Response) {
  const getSetCookie = (res.headers as any).getSetCookie
  const setCookies: string[] = typeof getSetCookie === 'function' ? getSetCookie.call(res.headers) : []
  for (const sc of setCookies) {
    const pair = sc.split(';')[0]
    const idx = pair.indexOf('=')
    if (idx === -1) continue
    jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
}

interface PortalCrypto { key: Buffer; iv: Buffer }

async function fetchPortalCrypto(baseUrl: string, fetchImpl: typeof fetch): Promise<PortalCrypto> {
  const res = await fetchImpl(`${baseUrl}/Script/Common.js`)
  const text = await res.text()
  const keyMatch = text.match(/_KEY\s*=\s*"([^"]+)"/)
  const ivMatch = text.match(/_IV\s*=\s*"([^"]+)"/)
  if (!keyMatch || !ivMatch) {
    throw new Error('Could not locate AES key/IV in portal Common.js — unsupported or changed platform version')
  }
  return { key: Buffer.from(keyMatch[1], 'utf8'), iv: Buffer.from(ivMatch[1], 'utf8') }
}

function aesEncryptHex(plain: string, c: PortalCrypto): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', c.key, c.iv)
  let enc = cipher.update(plain, 'utf8', 'hex')
  enc += cipher.final('hex')
  return enc
}

function aesDecryptHex(hex: string, c: PortalCrypto): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', c.key, c.iv)
  let dec = decipher.update(hex, 'hex', 'utf8')
  dec += decipher.final('utf8')
  return dec
}

function tryDecryptJson(raw: string, c: PortalCrypto): any {
  // Responses are wrapped as {"data":"<hex ciphertext>"} — unwrap before decrypting.
  let hex = raw
  try {
    const outer = JSON.parse(raw)
    if (outer && typeof outer === 'object' && typeof outer.data === 'string') {
      hex = outer.data
    }
  } catch {
    // raw wasn't JSON at all — try it directly as hex below.
  }
  try {
    return JSON.parse(aesDecryptHex(hex, c))
  } catch {
    // Some endpoints may return plain, unencrypted JSON — fall back gracefully.
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
}

async function solveCaptcha(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker('eng')
  try {
    await worker.setParameters({ tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' })
    const { data } = await worker.recognize(imageBuffer)
    return (data.text || '').replace(/[^0-9a-zA-Z]/g, '').trim()
  } finally {
    await worker.terminate()
  }
}

export interface LoginResult {
  success: boolean
  message?: string
  jar: CookieJar
  crypto: PortalCrypto
}

export async function login(baseUrl: string, username: string, password: string, fetchImpl: typeof fetch, maxAttempts = 3): Promise<LoginResult> {
  const jar: CookieJar = {}
  const portalCrypto = await fetchPortalCrypto(baseUrl, fetchImpl)

  // Establish session cookie.
  const loginPageRes = await fetchImpl(`${baseUrl}/StuApplication/Login.aspx`, { redirect: 'manual' })
  updateJar(jar, loginPageRes)

  let lastMessage = ''
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const codeId = Date.now().toString()
    const captchaRes = await fetchImpl(
      `${baseUrl}/Resources/CheckCode/CheckCode.ashx?notips=1&codeId=${codeId}&codeIdold=undefined`,
      { headers: { Cookie: cookieHeader(jar) } }
    )
    updateJar(jar, captchaRes)
    const captchaBuffer = Buffer.from(await captchaRes.arrayBuffer())
    const code = await solveCaptcha(captchaBuffer)

    const body = new URLSearchParams({
      LoginName: username,
      PassWord: aesEncryptHex(password, portalCrypto),
      Code: code,
      codeId,
    })

    const loginRes = await fetchImpl(`${baseUrl}/ajax/StuApplication/StuLogin.ashx?Method=StudentLogin&notips=1`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader(jar),
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body.toString(),
    })
    updateJar(jar, loginRes)
    const raw = await loginRes.text()
    const parsed = tryDecryptJson(raw, portalCrypto)
    if (process.env.PORTAL_DEBUG) {
      console.error(`[attempt ${attempt}] captcha guess="${code}" status=${loginRes.status} raw="${raw.slice(0, 80)}" parsed=${JSON.stringify(parsed)}`)
    }

    if (parsed?.IsSuccess) {
      return { success: true, jar, crypto: portalCrypto }
    }
    lastMessage = parsed?.Message || 'Login failed'
    // If it's a password/account problem (not a captcha misread), stop retrying —
    // don't risk tripping the site's account-lockout counter.
    if (/密码不正确|password/i.test(lastMessage) && !/verification|验证码/i.test(lastMessage)) {
      break
    }
  }

  return { success: false, message: lastMessage || 'Login failed after retries', jar, crypto: portalCrypto }
}

export type { PortalStudentRecord }

export async function fetchAllStudents(
  baseUrl: string,
  jar: CookieJar,
  portalCrypto: PortalCrypto,
  fetchImpl: typeof fetch
): Promise<PortalStudentRecord[]> {
  const pageSize = 50
  let page = 1
  let total = Infinity
  const results: PortalStudentRecord[] = []

  while ((page - 1) * pageSize < total) {
    const url =
      `${baseUrl}/ajax/AgencyAdmin/AgencyStuApply_list.aspx?action=GetstuApply_list` +
      `&page=${page}&pagesize=${pageSize}&IsPayFees=&IsMaterials=&Season=&DegreeID=&CountryID=` +
      `&PName=&PassportName=&StuYear=&admitstatus=&StageUserType=5`

    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { Cookie: cookieHeader(jar) },
    })
    const raw = await res.text()
    const parsed = tryDecryptJson(raw, portalCrypto)

    const rows = parsed?.ds || parsed?.Data?.ds || []
    const count = parsed?.ds1?.[0]?.datacount ?? parsed?.Data?.ds1?.[0]?.datacount
    if (typeof count === 'number') total = count
    else if (rows.length === 0) break

    for (const row of rows) {
      results.push({
        externalId: String(row.SAID ?? row.Stuid ?? row.ApplyNo),
        passportNo: row.PassportNo || null,
        passportName: row.PassportName || null,
        program: row.Pnamen || row.Pname || null,
        applyStatus: row.ApplyStatus != null ? String(row.ApplyStatus) : null,
        admitStatus: row.AdmitStatus != null ? String(row.AdmitStatus) : null,
        appliedAt: row.ApplyAt || null,
        raw: row,
      })
    }

    if (rows.length === 0) break
    page += 1
  }

  return results
}

export async function scanPortal(baseUrl: string, username: string, password: string, fetchImpl: typeof fetch = fetch) {
  const loginResult = await login(baseUrl, username, password, fetchImpl)
  if (!loginResult.success) {
    throw new Error(loginResult.message || 'Login failed')
  }
  const students = await fetchAllStudents(baseUrl, loginResult.jar, loginResult.crypto, fetchImpl)
  return students
}
