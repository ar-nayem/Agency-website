'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Trash2, UserCheck, UserX, Loader2,
  Mail, User, Key, Search, Copy, Check, Dices, X, Link2, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

export default function AgentsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const router = useRouter()
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'AGENT' })
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetCustom, setResetCustom] = useState('')
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [portalAccessId, setPortalAccessId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    if (session?.user?.role !== 'OWNER') {
      router.push('/dashboard')
      return
    }
    fetchAgents()
    fetchInvite()
  }, [session])

  async function fetchInvite() {
    try {
      const res = await fetch('/api/organization/invite', { credentials: 'include' })
      if (res.ok) setInviteCode((await res.json()).code)
    } catch {}
  }

  async function regenerateInvite() {
    if (!confirm(t('agentsPage.regenerateInviteConfirm'))) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/organization/invite', { method: 'POST', credentials: 'include' })
      if (res.ok) {
        setInviteCode((await res.json()).code)
        toast.success(t('agentsPage.inviteRegenerated'))
      } else {
        toast.error(t('agentsPage.updateFailed'))
      }
    } catch {
      toast.error(t('agentsPage.updateFailed'))
    } finally {
      setRegenerating(false)
    }
  }

  function copyInviteLink() {
    if (!inviteCode) return
    const url = `${window.location.origin}/register?code=${inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    })
  }

  async function fetchAgents() {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setAgents(data)
    } catch {
      toast.error(t('agentsPage.failedLoadAgents'))
    } finally {
      setLoading(false)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(t('agentsPage.accountCreated'))
        setShowForm(false)
        setFormData({ name: '', email: '', password: '', role: 'AGENT' })
        fetchAgents()
      } else {
        const data = await res.json()
        toast.error(data.error || t('agentsPage.failedCreate'))
      }
    } catch {
      toast.error(t('agentsPage.failedCreate'))
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(userId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (res.ok) {
        toast.success(currentStatus ? t('agentsPage.accountDeactivated') : t('agentsPage.accountActivated'))
        fetchAgents()
      } else {
        toast.error(t('agentsPage.updateFailed'))
      }
    } catch {
      toast.error(t('agentsPage.updateFailed'))
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm(t('agentsPage.deleteUserConfirm'))) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success(t('agentsPage.userDeleted'))
        fetchAgents()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || t('agentsPage.deleteFailed'))
      }
    } catch {
      toast.error(t('agentsPage.deleteFailed'))
    }
  }

  async function assignManager(agentId: string, adminId: string | null) {
    setAssigningId(agentId)
    try {
      const res = await fetch(`/api/users/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ managedByAdminId: adminId })
      })
      if (res.ok) {
        toast.success(t('agentsPage.managerUpdated'))
        fetchAgents()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || t('agentsPage.updateFailed'))
      }
    } catch {
      toast.error(t('agentsPage.updateFailed'))
    } finally {
      setAssigningId(null)
    }
  }

  async function togglePortalAccess(userId: string, next: boolean) {
    setPortalAccessId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ canViewPortals: next })
      })
      if (res.ok) {
        toast.success(t('agentsPage.portalAccessUpdated'))
        fetchAgents()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || t('agentsPage.updateFailed'))
      }
    } catch {
      toast.error(t('agentsPage.updateFailed'))
    } finally {
      setPortalAccessId(null)
    }
  }

  function openResetModal(u: any) {
    setResetTarget(u)
    setResetCustom('')
    setResetResult(null)
  }

  function closeResetModal() {
    setResetTarget(null)
    setResetCustom('')
    setResetResult(null)
    setCopied(false)
  }

  async function submitReset() {
    if (!resetTarget) return
    setResetSubmitting(true)
    try {
      const res = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(resetCustom.trim() ? { password: resetCustom.trim() } : {})
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setResetResult(data.password)
        setCopied(false)
      } else {
        toast.error(data.error || t('agentsPage.resetFailed'))
      }
    } catch {
      toast.error(t('agentsPage.resetFailed'))
    } finally {
      setResetSubmitting(false)
    }
  }

  function copyResult() {
    if (!resetResult) return
    navigator.clipboard.writeText(resetResult).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const admins = agents.filter(a => a.role === 'ADMIN')

  const filteredAgents = agents.filter((u) => {
    const q = search.trim().toLowerCase()
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    if (roleFilter && u.role !== roleFilter) return false
    if (statusFilter === 'active' && !u.isActive) return false
    if (statusFilter === 'inactive' && u.isActive) return false
    return true
  })

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('agentsPage.manageAccounts')}</h1>
          <p className="text-muted-foreground mt-1">{t('agentsPage.createAndManage')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('agentsPage.addAccount')}
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-foreground">{t('agentsPage.inviteLinkTitle')}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t('agentsPage.inviteLinkHint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={inviteCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?code=${inviteCode}` : ''}
            placeholder={t('common.loading')}
            className="flex-1 min-w-[240px] px-3 py-2 border border-border rounded-xl bg-muted text-sm text-foreground"
          />
          <button
            onClick={copyInviteLink}
            disabled={!inviteCode}
            className="px-3 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {inviteCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {inviteCopied ? t('agentsPage.copied') : t('agentsPage.copy')}
          </button>
          <button
            onClick={regenerateInvite}
            disabled={regenerating || !inviteCode}
            className="px-3 py-2 border border-border rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('agentsPage.regenerate')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('agentsPage.createNewAccount')}</h3>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('agentsPage.name')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder={t('agentsPage.fullNamePlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('agentsPage.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder={t('agentsPage.emailPlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('agentsPage.password')}</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder={t('agentsPage.passwordPlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('agentsPage.role')}</label>
              <select
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="AGENT">{t('common.roleAgent')}</option>
                <option value="ADMIN">{t('common.roleAdmin')}</option>
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-muted"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('agentsPage.createAccount')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t('common.search')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('agentsPage.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-muted/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t('agentsPage.role')}</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-muted/50"
            >
              <option value="">{t('agentsPage.allRoles')}</option>
              <option value="OWNER">{t('common.roleOwner')}</option>
              <option value="ADMIN">{t('common.roleAdmin')}</option>
              <option value="AGENT">{t('common.roleAgent')}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t('common.status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-muted/50"
            >
              <option value="">{t('agentsPage.allStatuses')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.role')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.managedBy')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.portalAccess')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.students')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.created')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAgents.map((user) => (
                <tr key={user.id} className="hover:bg-muted transition">
                  <td className="px-6 py-4 font-semibold text-foreground">
                    <Link href={`/dashboard/agents/${user.id}`} className="hover:text-indigo-600 transition-colors">
                      {user.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      user.role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
                      user.role === 'ADMIN' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    }`}>
                      {user.role === 'OWNER' ? t('common.roleOwner') : user.role === 'ADMIN' ? t('common.roleAdmin') : t('common.roleAgent')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'AGENT' ? (
                      <select
                        value={user.managedByAdminId || ''}
                        disabled={assigningId === user.id}
                        onChange={(e) => assignManager(user.id, e.target.value || null)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-muted/50 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                      >
                        <option value="">{t('agentsPage.unassigned')}</option>
                        {admins.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.role === 'ADMIN' ? (
                      <button
                        onClick={() => togglePortalAccess(user.id, !user.canViewPortals)}
                        disabled={portalAccessId === user.id}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                          user.canViewPortals
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 hover:bg-indigo-200'
                            : 'bg-muted text-muted-foreground hover:bg-muted/70'
                        }`}
                        title={t('agentsPage.togglePortalAccessHint')}
                      >
                        {user.canViewPortals ? t('agentsPage.allowed') : t('agentsPage.blocked')}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      user.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                    }`}>
                      {user.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{user._count?.students || 0}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openResetModal(user)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title={t('agentsPage.resetPassword')}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(user.id, user.isActive)}
                        className={`p-1.5 rounded-lg transition ${
                          user.isActive 
                            ? 'text-amber-600 hover:bg-amber-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={user.isActive ? t('agentsPage.deactivate') : t('agentsPage.activate')}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeResetModal}>
          <div className="bg-card rounded-2xl shadow-xl border border-border/60 w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-foreground">{t('agentsPage.resetPassword')}</h3>
              <button onClick={closeResetModal} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{resetTarget.name} · {resetTarget.email}</p>

            {resetResult ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('agentsPage.resetResultHint')}</p>
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5 mb-4">
                  <code className="flex-1 text-sm font-mono text-foreground select-all">{resetResult}</code>
                  <button onClick={copyResult} className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition shrink-0" title={t('common.copy')}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={closeResetModal} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium">
                  {t('common.done')}
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('agentsPage.newPasswordOptional')}</label>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={resetCustom}
                    onChange={e => setResetCustom(e.target.value)}
                    placeholder={t('agentsPage.leaveBlankToGenerate')}
                    className="flex-1 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-muted/50"
                  />
                  <button
                    type="button"
                    onClick={() => setResetCustom('')}
                    title={t('agentsPage.generateRandom')}
                    className="px-3 py-2 border border-border rounded-xl hover:bg-muted transition shrink-0"
                  >
                    <Dices className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={closeResetModal} className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-muted text-sm">
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={submitReset}
                    disabled={resetSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                  >
                    {resetSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('agentsPage.setPassword')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
