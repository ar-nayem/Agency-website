'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'
import { LanguageProvider } from '@/src/lib/i18n/LanguageContext'
import { ThemeProvider } from '@/src/lib/theme/ThemeContext'
import { ChatWidget } from '@/src/components/ChatWidget'
import { FeaturesProvider } from '@/src/lib/FeaturesContext'

function VisitorTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || lastTracked.current === pathname) return
    lastTracked.current = pathname
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LanguageProvider>
          <FeaturesProvider>
            <VisitorTracker />
            {children}
            <ChatWidget />
            <Toaster position="top-right" />
          </FeaturesProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
