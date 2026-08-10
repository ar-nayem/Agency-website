'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { Mail, ShieldCheck } from 'lucide-react'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  receiveAlerts: boolean
}

const DEVELOPER_EMAIL = '15329802848@163.com'

export default function AlertSettingsPage() {
  const { data: session } = useSession()
  const isOwner = session?.user?.role === 'OWNER'
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function fetchUsers() {
    fetch('/api/users', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data.filter((u: AdminUser) => u.role === 'ADMIN' || u.role === 'OWNER') : []))
      .catch(() => toast.error('Failed to load admins'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
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
        <p className="text-muted-foreground mt-1">Choose which admins receive system alert emails (new signups, submissions, status updates, portal scan results) alongside the developer.</p>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 shrink-0">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Developer inbox — always on</p>
          <p className="text-sm text-muted-foreground mt-0.5">{DEVELOPER_EMAIL} always receives every alert and cannot be turned off here.</p>
        </div>
      </div>

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
