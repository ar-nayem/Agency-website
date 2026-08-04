'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { dictionaries, Language } from './dictionaries'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const COOKIE_NAME = 'lang'

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

  useEffect(() => {
    const saved = readCookie(COOKIE_NAME)
    if (saved === 'en' || saved === 'zh') setLangState(saved)
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

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
