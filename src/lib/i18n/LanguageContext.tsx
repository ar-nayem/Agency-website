'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { dictionaries, Language } from './dictionaries'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: (path: string) => string
  timezone: string
  setTimezone: (tz: string) => void
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

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz)
    writeCookie(TZ_COOKIE_NAME, tz)
    fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ timezone: tz }),
    }).catch(() => {})
  }, [])

  const locale = lang === 'zh' ? 'zh-CN' : 'en-US'

  const formatDateTime = useCallback((date: string | number | Date, opts?: Intl.DateTimeFormatOptions): string => {
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleString(locale, { timeZone: timezone, ...opts })
  }, [locale, timezone])

  const formatDate = useCallback((date: string | number | Date, opts?: Intl.DateTimeFormatOptions): string => {
    const d = date instanceof Date ? date : new Date(date)
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
