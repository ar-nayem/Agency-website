'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface FeaturesValue {
  /** null = unrestricted (no package assigned, or not logged in yet). */
  enabled: string[] | null
  loaded: boolean
  has: (key: string) => boolean
}

const FeaturesContext = createContext<FeaturesValue>({ enabled: null, loaded: false, has: () => true })

// One fetch of the current user's package feature list, shared by every
// component that needs to hide a gated control. Until it resolves (and for
// orgs with no package at all) `has` returns true, so the UI renders
// complete rather than flashing controls in as the answer arrives — the
// server-side guard on each route is what actually enforces the gate.
export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<string[] | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setEnabled(Array.isArray(data?.enabledFeatures) ? data.enabledFeatures : null)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const has = (key: string) => enabled === null || enabled.includes(key)

  return <FeaturesContext.Provider value={{ enabled, loaded, has }}>{children}</FeaturesContext.Provider>
}

export function useFeatures() {
  return useContext(FeaturesContext)
}
