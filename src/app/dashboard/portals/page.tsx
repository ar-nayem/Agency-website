'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Plus, Trash2, Pencil, Globe, RefreshCw, Search, X,
  CheckCircle2, XCircle, Clock3, Users, History as HistoryIcon, Settings2, Info, Download, CalendarRange
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, subDays, startOfYear } from 'date-fns'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { categorizeAdmitStatus, STATUS_CATEGORIES, type StatusCategory } from '@/src/lib/portalStatus'

type Tab = 'portals' | 'students' | 'history'

// Kept local (rather than imported from portalConnectors) so this client
// component never pulls in the connector modules' server-only deps (node
// crypto, tesseract.js) into the browser bundle.
const PLATFORM_OPTIONS = [
  { value: 'AT0086', label: 'AT0086 (Script/Common.js AES login)' },
  { value: 'ISTUDYEDU', label: 'iStudy Agent Platform (plain login)' },
] as const

type DatePreset = 'today' | '7d' | '30d' | 'year' | 'all'

const CATEGORY_STYLES: Record<StatusCategory, string> = {
  UNSUBMITTED: 'bg-muted text-muted-foreground border-border',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 border-blue-200',
  PREADMISSION: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400 border-teal-200',
  ACCEPTED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200',
  REVOKED: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300 border-slate-300',
}

function categoryLabel(cat: StatusCategory, t: (key: string) => string) {
  return t(`portals.cat${cat.charAt(0)}${cat.slice(1).toLowerCase()}`)
}

export default function PortalsPage() {
  const { data: session } = useSession()
  const { t, formatDate, formatDateTime } = useLanguage()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('portals')
  const [portals, setPortals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [formData, setFormData] = useState({ name: '', loginUrl: '', username: '', password: '', platform: 'AT0086', useProxy: false })
  const [submitting, setSubmitting] = useState(false)
  const [scanningId, setScanningId] = useState<string | null>(null)

  const [settings, setSettings] = useState<{ intervalHours: number; enabled: boolean; staggerMinutes: number } | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)

  const [students, setStudents] = useState<any[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<StatusCategory | 'ALL'>('ALL')
  const [universityFilter, setUniversityFilter] = useState<string>('ALL')
  const [matchFilter, setMatchFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({ ALL: 0 })
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({ ALL: 0, MATCHED: 0, UNMATCHED: 0 })
  const [universityCounts, setUniversityCounts] = useState<Record<string, number>>({ ALL: 0 })

  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [accessChecked, setAccessChecked] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const role = session?.user?.role
  const isOwner = role === 'OWNER'

  useEffect(() => {
    if (!session) return
    if (role !== 'OWNER' && role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    if (role === 'OWNER') {
      setHasAccess(true)
      setAccessChecked(true)
      setTab('portals')
      fetchPortals()
      fetchSettings()
      return
    }
    // Admin: the JWT role alone doesn't carry the per-account grant — check live.
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const granted = !!data?.profile?.canViewPortals
        if (!granted) {
          router.push('/dashboard')
          return
        }
        setHasAccess(true)
        setTab('students')
        fetchPortals()
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setAccessChecked(true))
  }, [session])

  useEffect(() => {
    // Students intentionally does NOT auto-fetch here — that dataset can be
    // large (every snapshot row across every portal, with relations), and
    // this VPS is memory-constrained. Loading it is gated behind an explicit
    // Search click below instead of firing on every tab-open/keystroke.
    if (tab === 'history') fetchHistory()
  }, [tab])

  async function fetchPortals() {
    setLoading(true)
    try {
      const res = await fetch('/api/portals', { credentials: 'include' })
      const data = await res.json()
      setPortals(Array.isArray(data) ? data : [])
    } catch {
      toast.error(t('portals.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/portals/settings', { credentials: 'include' })
      const data = await res.json()
      setSettings({ intervalHours: data.intervalHours, enabled: data.enabled, staggerMinutes: data.staggerMinutes ?? 5 })
    } catch {
      toast.error(t('portals.loadFailed'))
    }
  }

  async function saveSettings(next: { intervalHours: number; enabled: boolean; staggerMinutes: number }) {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/portals/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSettings({ intervalHours: data.intervalHours, enabled: data.enabled, staggerMinutes: data.staggerMinutes ?? 5 })
      toast.success(t('portals.settingsSaved'))
    } catch {
      toast.error(t('portals.settingsSaveFailed'))
    } finally {
      setSavingSettings(false)
    }
  }

  function buildStudentFilterParams() {
    const params = new URLSearchParams()
    if (studentSearch) params.set('search', studentSearch)
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter)
    if (universityFilter !== 'ALL') params.set('portalId', universityFilter)
    if (matchFilter !== 'ALL') params.set('matched', matchFilter === 'MATCHED' ? '1' : '0')
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    return params
  }

  async function fetchStudents() {
    setStudentsLoading(true)
    try {
      const [res, countsRes] = await Promise.all([
        fetch(`/api/portals/students?${buildStudentFilterParams()}`, { credentials: 'include' }),
        fetch(`/api/portals/students/counts?${buildStudentFilterParams()}`, { credentials: 'include' }),
      ])
      const data = await res.json()
      setStudents(Array.isArray(data) ? data : [])
      const countsData = await countsRes.json()
      if (countsData?.byCategory) setCategoryCounts(countsData.byCategory)
      if (countsData?.byMatch) setMatchCounts(countsData.byMatch)
      if (countsData?.byPortal) setUniversityCounts(countsData.byPortal)
    } catch {
      toast.error(t('portals.loadFailed'))
    } finally {
      setStudentsLoading(false)
      setHasSearched(true)
    }
  }

  async function exportStudents() {
    try {
      const params = buildStudentFilterParams()
      const res = await fetch(`/api/portals/students/export?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `university-students-${Date.now()}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error(t('portals.exportFailed'))
    }
  }

  // Filtering (category/university/match/date/text) now all happens server-side —
  // the client only ever holds the rows matching the search that was actually
  // run, not the whole table. This just adds the display-only category label.
  const filteredStudents = useMemo(
    () => students.map((s) => ({ ...s, category: categorizeAdmitStatus(s.admitStatus, s.portalId) })),
    [students]
  )

  function applyDatePreset(preset: DatePreset) {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (preset === 'today') { setDateFrom(todayStr); setDateTo(todayStr) }
    else if (preset === '7d') { setDateFrom(format(subDays(new Date(), 6), 'yyyy-MM-dd')); setDateTo(todayStr) }
    else if (preset === '30d') { setDateFrom(format(subDays(new Date(), 29), 'yyyy-MM-dd')); setDateTo(todayStr) }
    else if (preset === 'year') { setDateFrom(format(startOfYear(new Date()), 'yyyy-MM-dd')); setDateTo(todayStr) }
    else { setDateFrom(''); setDateTo('') }
  }

  async function fetchHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/portals/changes', { credentials: 'include' })
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch {
      toast.error(t('portals.loadFailed'))
    } finally {
      setHistoryLoading(false)
    }
  }

  function openAdd() {
    setEditing(null)
    setFormData({ name: '', loginUrl: '', username: '', password: '', platform: 'AT0086', useProxy: false })
    setShowForm(true)
  }

  function openEdit(p: any) {
    setEditing(p)
    setFormData({ name: p.name, loginUrl: p.loginUrl, username: p.username, password: '', platform: p.platform || 'AT0086', useProxy: !!p.useProxy })
    setShowForm(true)
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = editing ? `/api/portals/${editing.id}` : '/api/portals'
      const method = editing ? 'PATCH' : 'POST'
      const body: any = { name: formData.name, loginUrl: formData.loginUrl, username: formData.username, platform: formData.platform, useProxy: formData.useProxy }
      if (formData.password) body.password = formData.password
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(t('portals.portalSaved'))
      setShowForm(false)
      fetchPortals()
    } catch {
      toast.error(t('portals.portalSaveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deletePortal(id: string) {
    if (!confirm(t('portals.deleteConfirm'))) return
    try {
      const res = await fetch(`/api/portals/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error()
      toast.success(t('portals.portalDeleted'))
      fetchPortals()
    } catch {
      toast.error(t('portals.portalDeleteFailed'))
    }
  }

  async function toggleActive(p: any) {
    try {
      const res = await fetch(`/api/portals/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !p.isActive }),
      })
      if (!res.ok) throw new Error()
      fetchPortals()
    } catch {
      toast.error(t('portals.portalSaveFailed'))
    }
  }

  async function scanNow(id: string) {
    setScanningId(id)
    try {
      const res = await fetch(`/api/portals/${id}/scan`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (data.success) toast.success(t('portals.scanSuccess'))
      else toast.error(`${t('portals.scanFailed')}: ${data.error || data.lastScanError || ''}`)
      fetchPortals()
    } catch {
      toast.error(t('portals.scanFailed'))
    } finally {
      setScanningId(null)
    }
  }

  if (!accessChecked || !hasAccess) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Globe className="w-6 h-6 text-indigo-600" /> {t('portals.title')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('portals.subtitle')}</p>
      </div>

      <div className="inline-flex items-center gap-1 bg-muted rounded-xl p-1">
        {isOwner && (
          <button onClick={() => setTab('portals')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'portals' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Settings2 className="w-4 h-4" /> {t('portals.portalsTab')}
          </button>
        )}
        <button onClick={() => setTab('students')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'students' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Users className="w-4 h-4" /> {t('portals.studentsTab')}
        </button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <HistoryIcon className="w-4 h-4" /> {t('portals.historyTab')}
        </button>
      </div>

      {tab === 'portals' && isOwner && (
        <>
          {settings && (
            <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('portals.scanSettings')}</h3>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => saveSettings({ ...settings, enabled: e.target.checked })}
                    disabled={savingSettings}
                    className="w-4 h-4 rounded"
                  />
                  {t('portals.scanEnabled')}
                </label>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span>{t('portals.scanInterval')}</span>
                  <select
                    value={settings.intervalHours}
                    onChange={(e) => saveSettings({ ...settings, intervalHours: Number(e.target.value) })}
                    disabled={savingSettings}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                  >
                    {[1, 2, 3, 5, 6, 8, 12, 24, 48].map((h) => (
                      <option key={h} value={h}>{h} {t('portals.hours')}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span>{t('portals.staggerGap')}</span>
                  <select
                    value={settings.staggerMinutes}
                    onChange={(e) => saveSettings({ ...settings, staggerMinutes: Number(e.target.value) })}
                    disabled={savingSettings}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                  >
                    {[2, 5, 10, 15, 30, 60].map((m) => (
                      <option key={m} value={m}>{m} {t('portals.minutes')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{t('portals.staggerHint')}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={openAdd} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-indigo-500/20">
              <Plus className="w-4 h-4" /> {t('portals.addPortal')}
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">{t('common.loading')}</div>
          ) : portals.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-10 text-center">
              <p className="text-sm text-muted-foreground">{t('portals.noPortals')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('portals.noPortalsHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {portals.map((p) => (
                <div key={p.id} className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{p.loginUrl}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('portals.username')}: {p.username}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${p.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200' : 'bg-muted text-muted-foreground border-border'}`}>
                      {p.isActive ? t('portals.active') : t('portals.inactive')}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs">
                    {p.lastScanStatus === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {p.lastScanStatus === 'ERROR' && <XCircle className="w-4 h-4 text-rose-600" />}
                    {!p.lastScanStatus && <Clock3 className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-muted-foreground">
                      {p.lastScanAt
                        ? `${formatDateTime(p.lastScanAt)} — ${p.lastScanStatus === 'SUCCESS' ? `${p.lastScanCount ?? 0} ${t('portals.studentsFound')}` : p.lastScanError}`
                        : t('portals.neverScanned')}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => scanNow(p.id)}
                      disabled={scanningId === p.id}
                      className="px-3 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5 text-xs font-medium disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${scanningId === p.id ? 'animate-spin' : ''}`} />
                      {scanningId === p.id ? t('portals.scanning') : t('portals.scanNow')}
                    </button>
                    <button onClick={() => openEdit(p)} className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition flex items-center gap-1.5 text-xs font-medium">
                      <Pencil className="w-3.5 h-3.5" /> {t('common.edit')}
                    </button>
                    <button onClick={() => toggleActive(p)} className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition text-xs font-medium">
                      {p.isActive ? t('portals.inactive') : t('portals.active')}
                    </button>
                    <button onClick={() => deletePortal(p.id)} className="px-3 py-2 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition text-xs font-medium">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'students' && (
        <div className="space-y-4">
          {portals.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">{t('portals.university')}</label>
              <select
                value={universityFilter}
                onChange={(e) => setUniversityFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground max-w-xs"
              >
                <option value="ALL">{t('portals.allUniversities')} ({universityCounts.ALL ?? 0})</option>
                {portals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({universityCounts[p.id] ?? 0})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(['ALL', ...STATUS_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {t(`portals.cat${cat.charAt(0)}${cat.slice(1).toLowerCase()}`)}
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${categoryFilter === cat ? 'bg-white/20' : 'bg-muted'}`}>
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5" /> {t('portals.appliedBetween')}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground"
              />
              <span className="text-muted-foreground text-sm">{t('portals.dateTo')}</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground"
              />
              {(dateFrom || dateTo) && (
                <button onClick={() => applyDatePreset('all')} className="text-xs text-muted-foreground hover:text-foreground underline">
                  {t('portals.clearDates')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {([
                ['today', 'portals.presetToday'],
                ['7d', 'portals.preset7d'],
                ['30d', 'portals.preset30d'],
                ['year', 'portals.presetYear'],
                ['all', 'portals.presetAll'],
              ] as const).map(([key, labelKey]) => (
                <button
                  key={key}
                  onClick={() => applyDatePreset(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background text-foreground hover:bg-muted transition"
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ['ALL', 'portals.matchAll'],
              ['MATCHED', 'portals.matchInMyStudents'],
              ['UNMATCHED', 'portals.matchNotInMyStudents'],
            ] as const).map(([val, key]) => (
              <button
                key={val}
                onClick={() => setMatchFilter(val)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${
                  matchFilter === val
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {t(key)}
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${matchFilter === val ? 'bg-white/20' : 'bg-muted'}`}>
                  {matchCounts[val] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {categoryFilter === 'REVOKED' && (
            <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3.5 text-sm text-amber-800 dark:text-amber-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('portals.revokedNoReasonNote')}</span>
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); fetchStudents() }}
            className="flex items-center gap-3 flex-wrap"
          >
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder={t('portals.search')}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={studentsLoading}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shrink-0 disabled:opacity-60"
            >
              <Search className="w-4 h-4" /> {studentsLoading ? t('portals.searching') : t('portals.searchButton')}
            </button>
            <button
              type="button"
              onClick={exportStudents}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl hover:bg-emerald-100 transition flex items-center gap-2 text-sm font-medium shrink-0"
            >
              <Download className="w-4 h-4" /> {t('portals.exportExcel')}
            </button>
          </form>
          {hasSearched && !studentsLoading && (
            <p className="text-xs text-muted-foreground">{filteredStudents.length} {t('portals.resultsFound')}</p>
          )}
          <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.university')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.passportName')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.passportNo')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.program')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.appliedAt')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.status')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.lastSeen')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.matchedStudent')}</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('universities.title')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {studentsLoading ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-muted-foreground text-sm">{t('common.loading')}</td></tr>
                  ) : !hasSearched ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-muted-foreground text-sm">{t('portals.chooseFiltersPrompt')}</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-muted-foreground text-sm">{t('portals.noStudentsYet')}</td></tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/60 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{s.portal?.name || '-'}</td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{s.passportName || '-'}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{s.passportNo || '-'}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{s.program || '-'}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{s.appliedAt ? formatDate(s.appliedAt) : '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${CATEGORY_STYLES[s.category as StatusCategory]}`}>
                            {t(`portals.cat${s.category.charAt(0)}${s.category.slice(1).toLowerCase()}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(s.lastSeenAt)}</td>
                        <td className="px-6 py-4 text-sm">
                          {s.matchedStudent ? (
                            <span className="text-indigo-600">{s.matchedStudent.fullName}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">{t('portals.notMatched')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {s.matchedStudent?.documentCoverage ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                title={t('universities.admissionLetters')}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  s.matchedStudent.documentCoverage.admissionLetter
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {t('universities.coverageAdmission')}
                              </span>
                              <span
                                title={t('universities.jw')}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  s.matchedStudent.documentCoverage.jw
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {t('universities.coverageJw')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs" title={t('universities.coverageNotMatched')}>—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.detectedAt')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.allPortals')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.passportName')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.changeField')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.oldValue')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('portals.newValue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyLoading ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground text-sm">{t('common.loading')}</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground text-sm">{t('portals.noChangesYet')}</td></tr>
                ) : (
                  history.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/60 transition-colors">
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(c.detectedAt)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{c.portal?.name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{c.passportName || c.passportNo || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{c.field === 'admitStatus' ? t('portals.admitStatus') : t('portals.applyStatus')}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {c.field === 'admitStatus' ? categoryLabel(categorizeAdmitStatus(c.oldValue, c.portalId), t) : (c.oldValue ?? '-')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                        {c.field === 'admitStatus' ? categoryLabel(categorizeAdmitStatus(c.newValue, c.portalId), t) : (c.newValue ?? '-')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-xl border border-border/60 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">{editing ? t('portals.editPortal') : t('portals.addPortal')}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitForm} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('portals.name')}</label>
                <input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('portals.namePlaceholder')} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('portals.platform')}</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('portals.loginUrl')}</label>
                <input required type="url" value={formData.loginUrl} onChange={(e) => setFormData({ ...formData, loginUrl: e.target.value })} placeholder={t('portals.loginUrlPlaceholder')} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('portals.username')}</label>
                <input required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('portals.password')}</label>
                <input required={!editing} type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editing ? '••••••••' : ''} className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
                <p className="text-[11px] text-muted-foreground mt-1">{t('portals.passwordHint')}</p>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.useProxy}
                  onChange={(e) => setFormData({ ...formData, useProxy: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-indigo-600"
                />
                <span>
                  <span className="text-sm font-medium text-foreground block">Route scans through proxy</span>
                  <span className="text-[11px] text-muted-foreground">Use if this portal blocks our server's IP directly (fetch failed, but the site is up). Scans will be relayed through a Cloudflare Worker instead.</span>
                </span>
              </label>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition">{t('portals.cancel')}</button>
                <button type="submit" disabled={submitting} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium shadow-sm shadow-indigo-500/20 disabled:opacity-60">{t('portals.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
