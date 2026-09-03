'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Search, Send, Users, Mail, CheckCircle2, XCircle, Clock, Sparkles, Code2, Eye, PenLine, UserPlus, Upload, Trash2, X, FileSpreadsheet, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { MERGE_FIELDS, applyMergeFields } from '@/src/lib/mergeFields'
import { EMAIL_TEMPLATES } from '@/src/lib/emailTemplates'
import { RichTextEditor } from '@/src/components/RichTextEditor'

interface Lead {
  id: string
  kind: 'user' | 'lead' | 'student'
  rawId: string
  name: string
  email: string
  organizationName: string | null
  role: string | null
  source: 'ACCOUNT' | 'MANUAL' | 'IMPORT' | 'STUDENT'
  isActive: boolean
  marketingOptOut: boolean
  createdAt: string
  timesContacted: number
  lastContactedAt: string | null
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
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [contactFilter, setContactFilter] = useState<'ALL' | 'NEW' | 'CONTACTED'>('ALL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'visual' | 'html' | 'preview'>('visual')

  // Previewed against a real selected recipient, so a merge that will look
  // wrong in someone's inbox looks wrong here first.
  const previewLead = leads.find((l) => selected.has(l.id)) || null
  const previewFor = previewLead
    ? { name: previewLead.name, email: previewLead.email, orgName: previewLead.organizationName }
    : { name: '', email: '', orgName: '' }

  // In visual mode the editor drops the token at the caret; in HTML mode
  // there is no caret to speak of, so it appends.
  function insertToken(token: string) {
    if (mode === 'visual') {
      document.dispatchEvent(new CustomEvent('campaign-insert-token', { detail: token }))
      return
    }
    setBody((b) => (b ? `${b}${b.endsWith('\n') ? '' : ' '}${token}` : token))
  }

  function applyTemplate(id: string) {
    const tpl = EMAIL_TEMPLATES.find((x) => x.id === id)
    if (!tpl) return
    if (body.trim() && !confirm(t('campaigns.templateConfirm'))) return
    setBody(tpl.html)
    if (!subject.trim()) setSubject(tpl.subject)
    setMode('visual')
  }
  const [sending, setSending] = useState(false)
  const [showAdd, setShowAdd] = useState<'single' | 'bulk' | null>(null)
  const [savingLead, setSavingLead] = useState(false)
  const [newLead, setNewLead] = useState({ name: '', email: '', organizationName: '', phone: '', country: '', notes: '' })
  const [bulkText, setBulkText] = useState('')

  async function addLead(e: React.FormEvent) {
    e.preventDefault()
    setSavingLead(true)
    try {
      const res = await fetch('/api/platform/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newLead),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('campaigns.leadAdded'))
        setNewLead({ name: '', email: '', organizationName: '', phone: '', country: '', notes: '' })
        setShowAdd(null)
        load()
      } else {
        toast.error(data.error || t('campaigns.leadAddFailed'))
      }
    } catch {
      toast.error(t('campaigns.leadAddFailed'))
    } finally {
      setSavingLead(false)
    }
  }

  async function importLeads(e: React.FormEvent) {
    e.preventDefault()
    setSavingLead(true)
    try {
      const res = await fetch('/api/platform/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bulk: bulkText }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(
          t('campaigns.importResult')
            .replace('{added}', String(data.added))
            .replace('{skipped}', String(data.skipped))
        )
        if (data.invalid?.length) toast.error(t('campaigns.importInvalid').replace('{n}', String(data.invalid.length)))
        setBulkText('')
        setShowAdd(null)
        load()
      } else {
        toast.error(data.error || t('campaigns.leadAddFailed'))
      }
    } catch {
      toast.error(t('campaigns.leadAddFailed'))
    } finally {
      setSavingLead(false)
    }
  }

  async function uploadLeadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSavingLead(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/platform/leads/import', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(
          t('campaigns.importResult')
            .replace('{added}', String(data.added))
            .replace('{skipped}', String(data.skipped))
        )
        if (data.invalid?.length) toast.error(t('campaigns.importInvalid').replace('{n}', String(data.invalid.length)))
        setShowAdd(null)
        load()
      } else {
        toast.error(data.error || t('campaigns.leadAddFailed'))
      }
    } catch {
      toast.error(t('campaigns.leadAddFailed'))
    } finally {
      setSavingLead(false)
      // Clear the input so re-picking the same file fires change again.
      e.target.value = ''
    }
  }

  async function deleteLead(lead: Lead) {
    if (!confirm(t('campaigns.deleteLeadConfirm').replace('{name}', lead.name))) return
    try {
      const res = await fetch(`/api/platform/leads/${lead.rawId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        setSelected((prev) => { const next = new Set(prev); next.delete(lead.id); return next })
        load()
      } else {
        toast.error(t('campaigns.leadDeleteFailed'))
      }
    } catch {
      toast.error(t('campaigns.leadDeleteFailed'))
    }
  }

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
    return eligibleLeads.filter((l) => {
      if (q) {
        const hit =
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.organizationName || '').toLowerCase().includes(q)
        if (!hit) return false
      }
      // Prospects have no account role, so they're their own bucket.
      if (roleFilter !== 'ALL') {
        const bucket = l.source === 'ACCOUNT' ? l.role : l.source === 'STUDENT' ? 'STUDENT' : 'PROSPECT'
        if (bucket !== roleFilter) return false
      }
      if (contactFilter === 'NEW' && l.timesContacted > 0) return false
      if (contactFilter === 'CONTACTED' && l.timesContacted === 0) return false
      return true
    })
  }, [eligibleLeads, search, roleFilter, contactFilter])

  // Only roles actually present, so the dropdown never offers an empty filter.
  const roleOptions = useMemo(() => {
    const set = new Set<string>()
    for (const l of eligibleLeads) {
      set.add(l.source === 'ACCOUNT' ? (l.role || 'UNKNOWN') : l.source === 'STUDENT' ? 'STUDENT' : 'PROSPECT')
    }
    return Array.from(set).sort()
  }, [eligibleLeads])

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
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-600">{t('campaigns.selected').replace('{count}', String(selected.size))}</span>
              <button
                type="button"
                onClick={() => setShowAdd(showAdd === 'single' ? null : 'single')}
                className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground transition inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> {t('campaigns.addLead')}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(showAdd === 'bulk' ? null : 'bulk')}
                className="px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground transition inline-flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> {t('campaigns.importLeads')}
              </button>
            </div>
          </div>

          {showAdd === 'single' && (
            <form onSubmit={addLead} className="p-4 border-b border-border bg-background/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input required value={newLead.name} onChange={(e) => setNewLead((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('campaigns.leadName')} className="px-3 py-2 border border-border rounded-xl text-sm bg-background outline-none focus:ring-2 focus:ring-indigo-500" />
                <input required type="email" value={newLead.email} onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))}
                  placeholder={t('campaigns.leadEmail')} className="px-3 py-2 border border-border rounded-xl text-sm bg-background outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={newLead.organizationName} onChange={(e) => setNewLead((p) => ({ ...p, organizationName: e.target.value }))}
                  placeholder={t('campaigns.leadCompany')} className="px-3 py-2 border border-border rounded-xl text-sm bg-background outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={newLead.phone} onChange={(e) => setNewLead((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={t('campaigns.leadPhone')} className="px-3 py-2 border border-border rounded-xl text-sm bg-background outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={savingLead}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2 disabled:opacity-50">
                  {savingLead && <Loader2 className="w-4 h-4 animate-spin" />} {t('campaigns.saveLead')}
                </button>
                <button type="button" onClick={() => setShowAdd(null)} className="px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition">
                  {t('campaigns.cancel')}
                </button>
              </div>
            </form>
          )}

          {showAdd === 'bulk' && (
            <form onSubmit={importLeads} className="p-4 border-b border-border bg-background/50 space-y-3">
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{t('campaigns.uploadTitle')}</p>
                <p className="text-[11px] text-muted-foreground mt-1 mb-3">{t('campaigns.uploadHint')}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <label className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2 cursor-pointer">
                    {savingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {t('campaigns.chooseFile')}
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={uploadLeadFile} disabled={savingLead} />
                  </label>
                  <a
                    href="/api/platform/leads/template"
                    className="px-3.5 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> {t('campaigns.downloadTemplate')}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{t('campaigns.orPaste')}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={6}
                placeholder={t('campaigns.bulkPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono bg-background outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-[11px] text-muted-foreground">{t('campaigns.bulkHint')}</p>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={savingLead || !bulkText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2 disabled:opacity-50">
                  {savingLead && <Loader2 className="w-4 h-4 animate-spin" />} {t('campaigns.importAction')}
                </button>
                <button type="button" onClick={() => setShowAdd(null)} className="px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted transition">
                  {t('campaigns.cancel')}
                </button>
              </div>
            </form>
          )}
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
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <select
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value as 'ALL' | 'NEW' | 'CONTACTED')}
                className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-background outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">{t('campaigns.filterAllContact')}</option>
                <option value="NEW">{t('campaigns.filterNeverEmailed')}</option>
                <option value="CONTACTED">{t('campaigns.filterAlreadyEmailed')}</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-border rounded-lg text-xs bg-background outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">{t('campaigns.filterAllRoles')}</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r === 'PROSPECT' ? t('campaigns.sourceProspect') : r === 'STUDENT' ? t('campaigns.sourceStudent') : r}
                  </option>
                ))}
              </select>
              {(roleFilter !== 'ALL' || contactFilter !== 'ALL' || search) && (
                <button
                  type="button"
                  onClick={() => { setRoleFilter('ALL'); setContactFilter('ALL'); setSearch('') }}
                  className="px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted transition inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> {t('campaigns.clearFilters')}
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {t('campaigns.showingCount').replace('{n}', String(filteredLeads.length))}
              </span>
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
                        {lead.timesContacted > 0 && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {t('campaigns.emailedTimes')
                              .replace('{n}', String(lead.timesContacted))
                              .replace('{date}', lead.lastContactedAt ? formatDateTime(lead.lastContactedAt) : '')}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">{lead.organizationName || '—'}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          {lead.source === 'ACCOUNT' ? (
                            <span className="text-muted-foreground text-xs">{lead.role}</span>
                          ) : lead.source === 'STUDENT' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400">
                              {t('campaigns.sourceStudent')}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                              {t('campaigns.sourceProspect')}
                            </span>
                          )}
                          {lead.kind === 'lead' && (
                            <button
                              type="button"
                              title={t('campaigns.deleteLead')}
                              onClick={(e) => { e.stopPropagation(); deleteLead(lead) }}
                              className="p-1 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
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
          {/* Templates */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {t('campaigns.startFrom')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {EMAIL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  className="text-left px-3 py-2 rounded-xl border border-border hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition"
                >
                  <span className="block text-xs font-semibold text-foreground">{tpl.name}</span>
                  <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">{tpl.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <label className="block text-sm font-medium text-foreground">{t('campaigns.body')}</label>
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted">
                {([
                  ['visual', PenLine, t('campaigns.modeVisual')],
                  ['html', Code2, t('campaigns.modeHtml')],
                  ['preview', Eye, t('campaigns.modePreview')],
                ] as const).map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    disabled={key === 'preview' && !previewLead}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition disabled:opacity-40 ${
                      mode === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'preview' && previewLead ? (
              <div className="w-full flex-1 px-3 py-2 border border-border rounded-xl bg-background overflow-auto">
                <p className="text-[11px] text-muted-foreground mb-2">
                  {t('campaigns.previewAs').replace('{name}', previewLead.name)}
                </p>
                <p className="text-sm font-semibold text-foreground mb-3">
                  {applyMergeFields(subject, previewFor) || <span className="text-muted-foreground font-normal">{t('campaigns.subject')}</span>}
                </p>
                <div
                  className="text-sm text-foreground [&_a]:text-indigo-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: applyMergeFields(body, previewFor) }}
                />
              </div>
            ) : mode === 'html' ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('campaigns.bodyPlaceholder')}
                rows={12}
                className="w-full flex-1 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono bg-background resize-none"
              />
            ) : (
              <RichTextEditor value={body} onChange={setBody} placeholder={t('campaigns.bodyPlaceholder')} />
            )}

            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'html' ? t('campaigns.bodyHintHtml') : t('campaigns.bodyHint')}
            </p>

            <div className="mt-2.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {t('campaigns.personalise')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_FIELDS.map((f) => (
                  <button
                    key={f.token}
                    type="button"
                    onClick={() => insertToken(f.token)}
                    title={t('campaigns.fallbackHint').replace('{value}', f.fallback || '—')}
                    className="px-2 py-1 rounded-lg border border-border text-[11px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  >
                    {f.token}
                  </button>
                ))}
              </div>
            </div>
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
