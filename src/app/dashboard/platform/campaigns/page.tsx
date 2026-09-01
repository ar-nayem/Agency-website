'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Search, Send, Users, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface Lead {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  marketingOptOut: boolean
  createdAt: string
  organization: { id: string; name: string } | null
}

interface CampaignSummary {
  id: string
  subject: string
  audience: string
  status: string
  totalCount: number
  sentCount: number
  failedCount: number
  createdAt: string
  completedAt: string | null
  createdBy: { name: string }
}

export default function CampaignsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t, formatDateTime } = useLanguage()

  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (session && session.user?.actualRole !== 'SUPER_DEVELOPER') {
      router.push('/dashboard')
      return
    }
    if (session) load()
  }, [session])

  async function load() {
    try {
      const [leadsRes, campaignsRes] = await Promise.all([
        fetch('/api/platform/leads', { credentials: 'include' }),
        fetch('/api/platform/campaigns', { credentials: 'include' }),
      ])
      if (leadsRes.ok) setLeads(await leadsRes.json())
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json())
    } catch {
      toast.error(t('campaigns.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const eligibleLeads = useMemo(() => leads.filter((l) => l.isActive && !l.marketingOptOut), [leads])

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return eligibleLeads
    return eligibleLeads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.organization?.name || '').toLowerCase().includes(q)
    )
  }, [eligibleLeads, search])

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selected.has(l.id))

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filteredLeads.forEach((l) => next.delete(l.id))
      } else {
        filteredLeads.forEach((l) => next.add(l.id))
      }
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function send() {
    if (!subject.trim() || !body.trim() || selected.size === 0) return
    if (!confirm(t('campaigns.sendConfirm').replace('{count}', String(selected.size)))) return

    setSending(true)
    try {
      const res = await fetch('/api/platform/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, html: body, recipientIds: Array.from(selected) }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('campaigns.sent'))
        setSubject('')
        setBody('')
        setSelected(new Set())
        router.push(`/dashboard/platform/campaigns/${data.id}`)
      } else {
        toast.error(data.error || t('campaigns.sendFailed'))
      }
    } catch {
      toast.error(t('campaigns.sendFailed'))
    } finally {
      setSending(false)
    }
  }

  function statusBadge(status: string) {
    const cfg: Record<string, { cls: string; icon: any; label: string }> = {
      SENDING: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', icon: Clock, label: t('campaigns.statusSending') },
      SENT: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', icon: CheckCircle2, label: t('campaigns.statusSent') },
      FAILED: { cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400', icon: XCircle, label: t('campaigns.statusFailed') },
    }
    const c = cfg[status] || cfg.SENDING
    const Icon = c.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-transparent ${c.cls}`}>
        <Icon className="w-3 h-3" /> {c.label}
      </span>
    )
  }

  if (!session || loading) return <div className="p-8 text-center">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('campaigns.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('campaigns.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Leads picker */}
        <div className="lg:col-span-3 bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3 bg-muted">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="w-4 h-4" /> {t('campaigns.leads')}
              <span className="text-muted-foreground font-normal">({eligibleLeads.length})</span>
            </div>
            <span className="text-xs font-medium text-indigo-600">{t('campaigns.selected').replace('{count}', String(selected.size))}</span>
          </div>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('campaigns.searchLeads')}
                className="w-full pl-9 pr-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-background"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[480px]">
            {filteredLeads.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">{t('campaigns.noLeads')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left w-8">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="px-2 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.leads')}</th>
                    <th className="px-2 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.organization')}</th>
                    <th className="px-2 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.role')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => toggleOne(lead.id)}
                      className={`cursor-pointer hover:bg-muted/60 transition-colors ${selected.has(lead.id) ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} className="rounded" />
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{lead.organization?.name || '—'}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{lead.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Compose */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-sm border border-border/60 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Mail className="w-4 h-4" /> {t('campaigns.compose')}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('campaigns.subject')}</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('campaigns.subjectPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-background"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-foreground mb-1">{t('campaigns.body')}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('campaigns.bodyPlaceholder')}
              rows={10}
              className="w-full flex-1 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono bg-background resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('campaigns.bodyHint')}</p>
          </div>
          <button
            onClick={send}
            disabled={sending || !subject.trim() || !body.trim() || selected.size === 0}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-sm shadow-sm disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? t('campaigns.sending') : `${t('campaigns.send')} (${selected.size})`}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted text-sm font-semibold text-foreground">{t('campaigns.history')}</div>
        {campaigns.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">{t('campaigns.noCampaigns')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.subject')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.recipients')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.status')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.createdBy')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.createdAt')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{c.subject}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {t('campaigns.progress').replace('{sent}', String(c.sentCount)).replace('{failed}', String(c.failedCount)).replace('{total}', String(c.totalCount))}
                    </td>
                    <td className="px-6 py-4">{statusBadge(c.status)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{c.createdBy?.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(c.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/platform/campaigns/${c.id}`} className="text-xs text-indigo-600 hover:underline">
                        {t('campaigns.viewDetails')}
                      </Link>
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
