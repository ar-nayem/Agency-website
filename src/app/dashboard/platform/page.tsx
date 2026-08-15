'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Building2, Users, GraduationCap, Ban, RotateCcw, LogIn, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface Org {
  id: string
  name: string
  slug: string
  status: string
  planTier: string
  studentLimit: number | null
  createdAt: string
  suspendedReason: string | null
  _count: { users: number; students: number }
}

export default function PlatformPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ organizationName: '', ownerName: '', ownerEmail: '', ownerPassword: '' })

  useEffect(() => {
    if (session && session.user?.actualRole !== 'SUPER_DEVELOPER') {
      router.push('/dashboard')
      return
    }
    if (session) fetchOrgs()
  }, [session])

  async function fetchOrgs() {
    try {
      const res = await fetch('/api/platform/organizations', { credentials: 'include' })
      if (res.ok) setOrgs(await res.json())
      else toast.error(t('platform.loadFailed'))
    } catch {
      toast.error(t('platform.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/platform/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('platform.created'))
        setShowForm(false)
        setForm({ organizationName: '', ownerName: '', ownerEmail: '', ownerPassword: '' })
        fetchOrgs()
      } else {
        toast.error(data.error || t('platform.createFailed'))
      }
    } catch {
      toast.error(t('platform.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(org: Org) {
    const suspending = org.status === 'ACTIVE'
    if (suspending && !confirm(t('platform.suspendConfirm'))) return
    const suspendedReason = suspending ? (prompt(t('platform.suspendReasonPrompt')) || undefined) : undefined
    setBusyId(org.id)
    try {
      const res = await fetch(`/api/platform/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: suspending ? 'SUSPENDED' : 'ACTIVE', suspendedReason }),
      })
      if (res.ok) fetchOrgs()
      else toast.error(t('platform.updateFailed'))
    } catch {
      toast.error(t('platform.updateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function enterOrg(org: Org) {
    setBusyId(org.id)
    try {
      const res = await fetch('/api/platform/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationId: org.id }),
      })
      if (res.ok) {
        await update({ impersonatingOrgId: org.id })
        router.push('/dashboard')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || t('platform.impersonateFailed'))
      }
    } catch {
      toast.error(t('platform.impersonateFailed'))
    } finally {
      setBusyId(null)
    }
  }

  if (!session || loading) return <div className="p-8 text-center">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('platform.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('platform.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {t('platform.createOrganization')}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <form onSubmit={createOrg} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('platform.organizationName')}</label>
              <input
                type="text" required
                value={form.organizationName}
                onChange={(e) => setForm((p) => ({ ...p, organizationName: e.target.value }))}
                placeholder={t('platform.organizationNamePlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('platform.ownerName')}</label>
              <input
                type="text" required
                value={form.ownerName}
                onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('platform.ownerEmail')}</label>
              <input
                type="email" required
                value={form.ownerEmail}
                onChange={(e) => setForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('platform.ownerPassword')}</label>
              <input
                type="password" required minLength={6}
                value={form.ownerPassword}
                onChange={(e) => setForm((p) => ({ ...p, ownerPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div className="md:col-span-4">
              <button
                type="submit" disabled={submitting}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? t('platform.creating') : t('platform.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        {orgs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">{t('platform.noOrganizations')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('platform.organizationName')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('platform.users')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('platform.students')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('platform.plan')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('platform.status')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{org._count.users}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{org._count.students}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{org.planTier}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
                        org.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200'
                      }`}>
                        {org.status === 'ACTIVE' ? t('platform.active') : t('platform.suspended')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => enterOrg(org)}
                          disabled={busyId === org.id}
                          title={t('platform.impersonate')}
                          className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex disabled:opacity-50"
                        >
                          <LogIn className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(org)}
                          disabled={busyId === org.id}
                          title={org.status === 'ACTIVE' ? t('platform.suspend') : t('platform.reactivate')}
                          className={`p-1.5 rounded-lg transition-colors inline-flex disabled:opacity-50 ${
                            org.status === 'ACTIVE' ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {org.status === 'ACTIVE' ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
