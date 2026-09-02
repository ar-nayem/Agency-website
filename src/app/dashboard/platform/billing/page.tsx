'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, Building2, CreditCard, X, CalendarClock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface Org {
  id: string
  name: string
  slug: string
  status: string
  isTrial: boolean
  accessExpiresAt: string | null
  alertEmail: string | null
  package: { id: string; name: string; price: number | null; currency: string; billingCycle: string } | null
  _count: { users: number; students: number }
}

interface Payment {
  id: string
  organizationId: string
  amount: number
  currency: string
  method: string | null
  reference: string | null
  note: string | null
  periodStart: string
  periodEnd: string
  createdAt: string
  organization: { id: string; name: string }
}

const METHODS = ['BANK_TRANSFER', 'ALIPAY', 'WECHAT', 'CASH', 'OTHER']

function toDateInput(d: Date) {
  // Local-date parts, not toISOString() — the latter shifts the day backwards
  // for anyone east of UTC, which would silently set the wrong expiry.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addMonths(from: Date, months: number) {
  const d = new Date(from)
  d.setMonth(d.getMonth() + months)
  return d
}

export default function BillingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t, formatDate } = useLanguage()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [pay, setPay] = useState({
    amount: '', currency: 'CNY', method: 'BANK_TRANSFER', reference: '', note: '',
    periodStart: toDateInput(new Date()), periodEnd: toDateInput(addMonths(new Date(), 1)),
  })
  const [access, setAccess] = useState({ accessExpiresAt: '', alertEmail: '', isTrial: false })

  useEffect(() => {
    if (session && session.user?.actualRole !== 'SUPER_DEVELOPER') {
      router.push('/dashboard')
      return
    }
    if (session) load()
  }, [session])

  async function load() {
    try {
      const [oRes, pRes] = await Promise.all([
        fetch('/api/platform/organizations', { credentials: 'include' }),
        fetch('/api/platform/payments', { credentials: 'include' }),
      ])
      if (oRes.ok) setOrgs(await oRes.json())
      else toast.error(t('billing.loadFailed'))
      if (pRes.ok) setPayments(await pRes.json())
    } catch {
      toast.error(t('billing.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  function openOrg(org: Org) {
    setOpenId(org.id)
    setAccess({
      accessExpiresAt: org.accessExpiresAt ? toDateInput(new Date(org.accessExpiresAt)) : '',
      alertEmail: org.alertEmail || '',
      isTrial: org.isTrial,
    })
    // Default the next paid period to start where the current one ends, so
    // renewing early doesn't quietly discard the time already paid for.
    const base = org.accessExpiresAt && new Date(org.accessExpiresAt) > new Date()
      ? new Date(org.accessExpiresAt)
      : new Date()
    setPay((p) => ({
      ...p,
      amount: org.package?.price != null ? String(org.package.price) : '',
      currency: org.package?.currency || 'CNY',
      periodStart: toDateInput(base),
      periodEnd: toDateInput(addMonths(base, org.package?.billingCycle === 'YEARLY' ? 12 : org.package?.billingCycle === 'QUARTERLY' ? 3 : 1)),
    }))
  }

  async function recordPayment(orgId: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/platform/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationId: orgId, ...pay }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('billing.recorded'))
        setOpenId(null)
        load()
      } else {
        toast.error(data.error || t('billing.recordFailed'))
      }
    } catch {
      toast.error(t('billing.recordFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function saveAccess(orgId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/platform/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accessExpiresAt: access.accessExpiresAt || null,
          alertEmail: access.alertEmail,
          isTrial: access.isTrial,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('billing.updated'))
        setOpenId(null)
        load()
      } else {
        toast.error(data.error || t('billing.updateFailed'))
      }
    } catch {
      toast.error(t('billing.updateFailed'))
    } finally {
      setBusy(false)
    }
  }

  function accessBadge(org: Org) {
    if (!org.accessExpiresAt) {
      return <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">{t('billing.noExpiry')}</span>
    }
    const ms = new Date(org.accessExpiresAt).getTime() - Date.now()
    const days = Math.ceil(ms / 86400000)
    if (ms <= 0) {
      return <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">{t('billing.expired')}</span>
    }
    const label = days === 1 ? t('billing.oneDayLeft') : t('billing.daysLeft').replace('{n}', String(days))
    const tone = days <= 7
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
    return <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${tone}`}>{label}</span>
  }

  if (!session || loading) return <div className="p-8 text-center">{t('common.loading')}</div>

  const inputClass = 'w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-card'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('billing.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('billing.subtitle')}</p>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('billing.organization')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('billing.plan')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('billing.access')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('billing.accessUntil')}</th>
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
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          {org.name}
                          {org.isTrial && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                              {t('billing.trial')}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{org._count.users} users · {org._count.students} students</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {org.package ? (
                      <>
                        {org.package.name}
                        {org.package.price != null && (
                          <span className="block text-xs">{org.package.price} {org.package.currency}</span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">{accessBadge(org)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {org.accessExpiresAt ? formatDate(org.accessExpiresAt) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => (openId === org.id ? setOpenId(null) : openOrg(org))}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition"
                    >
                      {openId === org.id ? t('billing.close') : t('billing.manage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openId && (() => {
        const org = orgs.find((o) => o.id === openId)
        if (!org) return null
        const orgPayments = payments.filter((p) => p.organizationId === org.id)
        const total = orgPayments.reduce((sum, p) => sum + p.amount, 0)
        return (
          <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 space-y-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{org.name}</h2>
                {orgPayments.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('billing.totalPaid')}: {total} {orgPayments[0].currency}
                  </p>
                )}
              </div>
              <button onClick={() => setOpenId(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Record payment */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-foreground">{t('billing.recordPayment')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.amount')}</label>
                  <input type="number" min={0} step="0.01" value={pay.amount}
                    onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.currency')}</label>
                  <input type="text" value={pay.currency}
                    onChange={(e) => setPay((p) => ({ ...p, currency: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.method')}</label>
                  <select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))} className={inputClass}>
                    {METHODS.map((m) => <option key={m} value={m}>{t(`billing.method${m}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.reference')}</label>
                  <input type="text" value={pay.reference} placeholder={t('billing.referencePlaceholder')}
                    onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.periodStart')}</label>
                  <input type="date" value={pay.periodStart}
                    onChange={(e) => setPay((p) => ({ ...p, periodStart: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.periodEnd')}</label>
                  <input type="date" value={pay.periodEnd}
                    onChange={(e) => setPay((p) => ({ ...p, periodEnd: e.target.value }))} className={inputClass} />
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.note')}</label>
                  <input type="text" value={pay.note}
                    onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {[
                  { label: t('billing.extendMonth'), months: 1 },
                  { label: t('billing.extendQuarter'), months: 3 },
                  { label: t('billing.extendYear'), months: 12 },
                ].map((opt) => (
                  <button key={opt.months} type="button"
                    onClick={() => setPay((p) => ({ ...p, periodEnd: toDateInput(addMonths(new Date(p.periodStart), opt.months)) }))}
                    className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition">
                    {opt.label}
                  </button>
                ))}
                <button
                  onClick={() => recordPayment(org.id)}
                  disabled={busy || !pay.amount}
                  className="ml-auto px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {busy ? t('billing.saving') : t('billing.save')}
                </button>
              </div>
            </div>

            {/* Access settings */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-foreground">{t('billing.accessSettings')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('billing.accessExpiresAt')}</label>
                  <input type="date" value={access.accessExpiresAt}
                    onChange={(e) => setAccess((p) => ({ ...p, accessExpiresAt: e.target.value }))} className={inputClass} />
                  <p className="text-[11px] text-muted-foreground mt-1">{t('billing.accessExpiresHint')}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />{t('billing.alertEmail')}
                  </label>
                  <input type="email" value={access.alertEmail} placeholder={t('billing.alertEmailHint')}
                    onChange={(e) => setAccess((p) => ({ ...p, alertEmail: e.target.value }))} className={inputClass} />
                  <p className="text-[11px] text-muted-foreground mt-1">{t('billing.alertEmailHint')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={access.isTrial} className="accent-indigo-600"
                    onChange={(e) => setAccess((p) => ({ ...p, isTrial: e.target.checked }))} />
                  {t('billing.markTrial')}
                </label>
                <button
                  onClick={() => saveAccess(org.id)}
                  disabled={busy}
                  className="ml-auto px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition disabled:opacity-50"
                >
                  {t('billing.updateAccess')}
                </button>
              </div>
            </div>

            {/* History */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('billing.paymentHistory')}</h3>
              {orgPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('billing.noPayments')}</p>
              ) : (
                <div className="space-y-2">
                  {orgPayments.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-muted/50 text-sm">
                      <span className="font-medium text-foreground">{p.amount} {p.currency}</span>
                      <span className="text-muted-foreground text-xs">{p.method ? t(`billing.method${p.method}`) : '—'}</span>
                      <span className="text-muted-foreground text-xs">{formatDate(p.periodStart)} → {formatDate(p.periodEnd)}</span>
                      <span className="text-muted-foreground text-xs">{p.reference || p.note || ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
