'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { dictionaries, Language } from './dictionaries'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: (path: string) => string
  timezone: string
  setTimezone: (raw: string) => boolean
  formatDateTime: (date: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string
  formatDate: (date: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const COOKIE_NAME = 'lang'
const TZ_COOKIE_NAME = 'tz'

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Accepts "+8", "-5", "+5:30", "5.5", "UTC+6", "GMT-3" — whatever a user
// types for a manual UTC offset — and returns whole minutes, or null if
// it doesn't parse as a plausible offset (-12:00..+14:00).
export function parseUtcOffsetMinutes(raw: string): number | null {
  const s = raw.trim().toUpperCase().replace(/^UTC/, '').replace(/^GMT/, '')
  if (s === '') return null
  if (s === 'Z' || s === '0' || s === '+0' || s === '-0') return 0
  const m = s.match(/^([+-]?)(\d{1,2})(?:[:.](\d{1,2}))?$/)
  if (!m) return null
  const sign = m[1] === '-' ? -1 : 1
  const hours = parseInt(m[2], 10)
  let minutes = 0
  if (m[3]) {
    minutes = s.includes('.')
      ? Math.round(parseFloat(`0.${m[3]}`) * 60)
      : parseInt(m[3].padEnd(2, '0').slice(0, 2), 10)
  }
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes > 0)) return null
  return sign * (hours * 60 + minutes)
}

export function offsetMinutesToString(mins: number): string {
  const sign = mins < 0 ? '-' : '+'
  const abs = Math.abs(mins)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `${sign}${h}:${m}`
}

function isOffsetString(tz: string): boolean {
  return /^[+-]\d{2}:\d{2}$/.test(tz)
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

function lookup(dict: any, path: string): unknown {
  return path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), dict)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')
  const [timezone, setTimezoneState] = useState<string>('UTC')

  useEffect(() => {
    const saved = readCookie(COOKIE_NAME)
    if (saved === 'en' || saved === 'zh') setLangState(saved)

    const savedTz = readCookie(TZ_COOKIE_NAME)
    setTimezoneState(savedTz || browserTimezone())

    // DB value (set explicitly by the user in their profile) wins over the
    // cookie/browser guess once it loads — keeps the choice consistent
    // across devices/browsers, not just the one that set the cookie.
    fetch('/api/profile', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const tz = data?.profile?.timezone
        if (tz) {
          setTimezoneState(tz)
          writeCookie(TZ_COOKIE_NAME, tz)
        }
      })
      .catch(() => {})
  }, [])

  const setLang = useCallback((next: Language) => {
    setLangState(next)
    writeCookie(COOKIE_NAME, next)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'zh' : 'en')
  }, [lang, setLang])

  const t = useCallback((path: string): string => {
    const value = lookup(dictionaries[lang], path)
    if (typeof value === 'string') return value
    const fallback = lookup(dictionaries.en, path)
    return typeof fallback === 'string' ? fallback : path
  }, [lang])

  // Each user types their own UTC offset (e.g. "+8", "-5", "+5:30") — no
  // shared IANA list to pick from. Returns false and leaves state untouched
  // if the input doesn't parse, so the caller can show a validation error.
  const setTimezone = useCallback((raw: string) => {
    const mins = parseUtcOffsetMinutes(raw)
    if (mins === null) return false
    const canonical = offsetMinutesToString(mins)
    setTimezoneState(canonical)
    writeCookie(TZ_COOKIE_NAME, canonical)
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ timezone: canonical }),
    }).catch(() => {})
    return true
  }, [])

  const locale = lang === 'zh' ? 'zh-CN' : 'en-US'

  const formatDateTime = useCallback((date: string | number | Date, opts?: Intl.DateTimeFormatOptions): string => {
    const d = date instanceof Date ? date : new Date(date)
    if (isOffsetString(timezone)) {
      const mins = parseUtcOffsetMinutes(timezone) ?? 0
      const shifted = new Date(d.getTime() + mins * 60000)
      return shifted.toLocaleString(locale, { timeZone: 'UTC', ...opts })
    }
    return d.toLocaleString(locale, { timeZone: timezone, ...opts })
  }, [locale, timezone])

  const formatDate = useCallback((date: string | number | Date, opts?: Intl.DateTimeFormatOptions): string => {
    const d = date instanceof Date ? date : new Date(date)
    if (isOffsetString(timezone)) {
      const mins = parseUtcOffsetMinutes(timezone) ?? 0
      const shifted = new Date(d.getTime() + mins * 60000)
      return shifted.toLocaleDateString(locale, { timeZone: 'UTC', ...opts })
    }
    return d.toLocaleDateString(locale, { timeZone: timezone, ...opts })
  }, [locale, timezone])

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, timezone, setTimezone, formatDateTime, formatDate }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
