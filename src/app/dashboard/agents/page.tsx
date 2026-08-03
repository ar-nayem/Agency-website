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

export default function AgentsPage() {
  const { data: session } = useSession()
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
      toast.error('Failed to load agents')
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
        toast.success('Account created')
        setShowForm(false)
        setFormData({ name: '', email: '', password: '', role: 'AGENT' })
        fetchAgents()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create')
      }
    } catch {
      toast.error('Failed to create')
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
        toast.success(`Account ${currentStatus ? 'deactivated' : 'activated'}`)
        fetchAgents()
      } else {
        toast.error('Update failed')
      }
    } catch {
      toast.error('Update failed')
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Delete this user?')) return
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success('User deleted')
        fetchAgents()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Delete failed')
      }
    } catch {
      toast.error('Delete failed')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Accounts</h1>
          <p className="text-gray-500 mt-1">Create and manage agent and admin accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Account</h3>
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Full name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Password"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Students</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <Link href={`/dashboard/agents/${user.id}`} className="hover:text-indigo-600 transition-colors">
                      {user.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      user.role === 'OWNER' ? 'bg-amber-100 text-amber-700' :
                      user.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user._count?.students || 0}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
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
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Delete"
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
