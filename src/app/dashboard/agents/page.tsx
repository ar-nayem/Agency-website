'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Trash2, UserCheck, UserX, Loader2,
  Mail, User, Key
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

  useEffect(() => {
    if (session?.user?.role !== 'OWNER') {
      router.push('/dashboard')
      return
    }
    fetchAgents()
  }, [session])

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

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.role')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.students')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('agentsPage.created')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((user) => (
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
    </div>
  )
}
