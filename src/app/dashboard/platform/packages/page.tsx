'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Package as PackageIcon, Building2, Pencil, Trash2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { FEATURES } from '@/src/lib/features'

interface Pkg {
  id: string
  name: string
  description: string | null
  features: string[]
  studentLimit: number | null
  sortOrder: number
  _count: { organizations: number }
}

const GROUPS = Array.from(new Set(FEATURES.map((f) => f.group)))

export default function PackagesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [pkgs, setPkgs] = useState<Pkg[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<{ name: string; description: string; studentLimit: string; features: string[] } | null>(null)
  const [form, setForm] = useState({ name: '', description: '', studentLimit: '', features: [] as string[] })

  useEffect(() => {
    if (session && session.user?.actualRole !== 'SUPER_DEVELOPER') {
      router.push('/dashboard')
      return
    }
    if (session) fetchPkgs()
  }, [session])

  async function fetchPkgs() {
    try {
      const res = await fetch('/api/platform/packages', { credentials: 'include' })
      if (res.ok) setPkgs(await res.json())
      else toast.error(t('packages.loadFailed'))
    } catch {
      toast.error(t('packages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  function toggleFeature(list: string[], key: string): string[] {
    return list.includes(key) ? list.filter((f) => f !== key) : [...list, key]
  }

  async function createPkg(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/platform/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          studentLimit: form.studentLimit ? Number(form.studentLimit) : null,
          features: form.features,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('packages.created'))
        setShowForm(false)
        setForm({ name: '', description: '', studentLimit: '', features: [] })
        fetchPkgs()
      } else {
        toast.error(data.error || t('packages.createFailed'))
      }
    } catch {
      toast.error(t('packages.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(pkg: Pkg) {
    setEditingId(pkg.id)
    setEditState({
      name: pkg.name,
      description: pkg.description || '',
      studentLimit: pkg.studentLimit === null ? '' : String(pkg.studentLimit),
      features: pkg.features,
    })
  }

  async function saveEdit(id: string) {
    if (!editState) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/platform/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editState.name,
          description: editState.description || null,
          studentLimit: editState.studentLimit ? Number(editState.studentLimit) : null,
          features: editState.features,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('packages.saved'))
        setEditingId(null)
        setEditState(null)
        fetchPkgs()
      } else {
        toast.error(data.error || t('packages.saveFailed'))
      }
    } catch {
      toast.error(t('packages.saveFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function deletePkg(pkg: Pkg) {
    if (!confirm(t('packages.deleteConfirm'))) return
    setBusyId(pkg.id)
    try {
      const res = await fetch(`/api/platform/packages/${pkg.id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) fetchPkgs()
      else toast.error(t('packages.deleteFailed'))
    } catch {
      toast.error(t('packages.deleteFailed'))
    } finally {
      setBusyId(null)
    }
  }

  if (!session || loading) return <div className="p-8 text-center">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('packages.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('packages.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {t('packages.createPackage')}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <form onSubmit={createPkg} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('packages.packageName')}</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('packages.packageNamePlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('packages.description')}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t('packages.descriptionPlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('packages.studentLimit')}</label>
                <input
                  type="number" min={0}
                  value={form.studentLimit}
                  onChange={(e) => setForm((p) => ({ ...p, studentLimit: e.target.value }))}
                  placeholder={t('packages.studentLimitPlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('packages.features')}</label>
              <FeatureGrid selected={form.features} onToggle={(key) => setForm((p) => ({ ...p, features: toggleFeature(p.features, key) }))} t={t} />
            </div>

            <button
              type="submit" disabled={submitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? t('packages.creating') : t('packages.create')}
            </button>
          </form>
        </div>
      )}

      {pkgs.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
          {t('packages.noPackages')}
        </div>
      ) : (
        <div className="space-y-4">
          {pkgs.map((pkg) => (
            <div key={pkg.id} className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
              {editingId === pkg.id && editState ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">{t('packages.packageName')}</label>
                      <input
                        type="text" required
                        value={editState.name}
                        onChange={(e) => setEditState((p) => p && { ...p, name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">{t('packages.description')}</label>
                      <input
                        type="text"
                        value={editState.description}
                        onChange={(e) => setEditState((p) => p && { ...p, description: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">{t('packages.studentLimit')}</label>
                      <input
                        type="number" min={0}
                        value={editState.studentLimit}
                        onChange={(e) => setEditState((p) => p && { ...p, studentLimit: e.target.value })}
                        placeholder={t('packages.studentLimitPlaceholder')}
                        className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">{t('packages.features')}</label>
                    <FeatureGrid
                      selected={editState.features}
                      onToggle={(key) => setEditState((p) => p && { ...p, features: toggleFeature(p.features, key) })}
                      t={t}
                    />
                    {editState.features.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{t('packages.noFeaturesSelected')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(pkg.id)}
                      disabled={busyId === pkg.id}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {busyId === pkg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {busyId === pkg.id ? t('packages.saving') : t('packages.save')}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditState(null) }}
                      className="px-4 py-2 rounded-xl font-medium text-sm text-muted-foreground hover:bg-muted transition"
                    >
                      {t('packages.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <PackageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{pkg.name}</p>
                        {pkg.description && <p className="text-sm text-muted-foreground mt-0.5">{pkg.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{pkg._count.organizations} {t('packages.organizations')}</span>
                          {pkg.studentLimit !== null && <span>{t('packages.studentLimit')}: {pkg.studentLimit}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(pkg)}
                        title={t('packages.edit')}
                        className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors inline-flex"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePkg(pkg)}
                        disabled={busyId === pkg.id}
                        title={t('packages.delete')}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors inline-flex disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {pkg.features.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">{t('packages.noFeaturesSelected')}</span>
                    ) : (
                      FEATURES.filter((f) => pkg.features.includes(f.key)).map((f) => (
                        <span key={f.key} className="px-2 py-1 rounded-lg bg-muted text-[11px] font-medium text-foreground">
                          {f.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureGrid({ selected, onToggle, t }: { selected: string[]; onToggle: (key: string) => void; t: (key: string) => string }) {
  return (
    <div className="space-y-4">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {group === 'Core' ? t('packages.groupCore') : group === 'Admin' ? t('packages.groupAdmin') : group}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FEATURES.filter((f) => f.group === group).map((f) => (
              <label
                key={f.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
                  selected.includes(f.key)
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(f.key)}
                  onChange={() => onToggle(f.key)}
                  className="accent-indigo-600"
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
