'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Mail, Loader2 } from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  receiveAlerts: boolean
}

export default function AlertSettingsPage() {
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'OWNER'
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [alertEmail, setAlertEmail] = useState('')
  const [effective, setEffective] = useState<string | null>(null)
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  function fetchAlertEmail() {
    fetch('/api/organization/alert-email', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setAlertEmail(data.alertEmail || '')
        setEffective(data.effective)
        setOwnerEmail(data.ownerEmail)
      })
      .catch(() => {})
  }

  async function saveAlertEmail(e: React.FormEvent) {
    e.preventDefault()
    setSavingEmail(true)
    try {
      const res = await fetch('/api/organization/alert-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ alertEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Alert email updated')
        setAlertEmail(data.alertEmail || '')
        setEffective(data.effective)
      } else {
        toast.error(data.error || 'Update failed')
      }
    } catch {
      toast.error('Update failed')
    } finally {
      setSavingEmail(false)
    }
  }

  function fetchUsers() {
    fetch('/api/users', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data.filter((u: AdminUser) => u.role === 'ADMIN' || u.role === 'OWNER') : []))
      .catch(() => toast.error('Failed to load admins'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
    fetchAlertEmail()
  }, [])

  async function toggleAlerts(userId: string, next: boolean) {
    setTogglingId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ receiveAlerts: next }),
      })
      if (res.ok) {
        toast.success('Alert recipient updated')
        fetchUsers()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Update failed')
      }
    } catch {
      toast.error('Update failed')
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  if (!isOwner) {
    return <div className="p-8 text-center text-muted-foreground">Only the owner can manage alert email recipients.</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alert Email Settings</h1>
        <p className="text-muted-foreground mt-1">Where your organization receives system alert emails — new signups, student submissions, status updates and portal scan results.</p>
      </div>

      <form onSubmit={saveAlertEmail} className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 shrink-0">
            <Mail className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Your organization&apos;s alert email</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Alerts for your students and staff go here — a shared company inbox works well.
              Leave it empty to use the owner account address{ownerEmail ? ` (${ownerEmail})` : ''}.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder={ownerEmail || 'alerts@youragency.com'}
                className="flex-1 min-w-[240px] px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-card"
              />
              <button
                type="submit"
                disabled={savingEmail}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2 disabled:opacity-50"
              >
                {savingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
            {effective && (
              <p className="text-xs text-muted-foreground mt-2">
                Currently delivering to <strong className="text-foreground">{effective}</strong>
                {alertEmail ? '' : ' (owner account address)'}.
              </p>
            )}
          </div>
        </div>
      </form>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Receives alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/60 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {u.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{u.role}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleAlerts(u.id, !u.receiveAlerts)}
                      disabled={togglingId === u.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                        u.receiveAlerts
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 hover:bg-indigo-200'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {u.receiveAlerts ? 'On' : 'Off'}
                    </button>
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
