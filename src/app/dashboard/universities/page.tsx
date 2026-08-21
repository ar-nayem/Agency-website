'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Search, Loader2, GraduationCap, FileText, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface UniversityRow {
  id: string
  name: string
  country: string | null
  notes: string | null
  createdAt: string
  _count: { documents: number }
}

export default function UniversitiesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t, formatDate } = useLanguage()

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  const [universities, setUniversities] = useState<UniversityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', country: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/dashboard')
      return
    }
    if (session) fetchUniversities()
  }, [session])

  async function fetchUniversities() {
    try {
      const res = await fetch('/api/universities', { credentials: 'include' })
      if (!res.ok) throw new Error()
      setUniversities(await res.json())
    } catch {
      toast.error(t('universities.failedLoad'))
    } finally {
      setLoading(false)
    }
  }

  async function createUniversity(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(t('universities.created'))
        setShowForm(false)
        setForm({ name: '', country: '', notes: '' })
        fetchUniversities()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || t('universities.failedCreate'))
      }
    } catch {
      toast.error(t('universities.failedCreate'))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteUniversity(id: string) {
    if (!confirm(t('universities.deleteConfirm'))) return
    try {
      const res = await fetch(`/api/universities/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success(t('universities.deleted'))
        fetchUniversities()
      } else {
        toast.error(t('universities.failedDelete'))
      }
    } catch {
      toast.error(t('universities.failedDelete'))
    }
  }

  const filtered = universities.filter(u => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || (u.country || '').toLowerCase().includes(q)
  })

  if (!isAdmin) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('universities.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('universities.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('universities.addUniversity')}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('universities.addUniversity')}</h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={createUniversity} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('universities.name')}</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={t('universities.namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('universities.country')}</label>
              <input
                value={form.country}
                onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={t('universities.countryPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('universities.notes')}</label>
              <input
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={t('universities.notesPlaceholder')}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-xl text-sm text-foreground hover:bg-muted">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('universities.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('universities.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-muted/50"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{t('universities.noUniversities')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 hover:bg-muted transition">
                <Link href={`/dashboard/universities/${u.id}`} className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {u.country || t('universities.noCountry')} · {formatDate(u.createdAt)}
                  </p>
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />{u._count.documents}
                  </span>
                  <button
                    onClick={() => deleteUniversity(u.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
