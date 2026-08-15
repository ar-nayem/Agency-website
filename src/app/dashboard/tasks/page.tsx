'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Trash2, Clock, X, ListTodo } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface TaskItem {
  id: string
  title: string
  description: string | null
  dueAt: string
  status: string
  completedAt: string | null
  assignedTo: { id: string; name: string; email: string }
  createdBy: { id: string; name: string }
}

export default function TasksPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t, formatDateTime } = useLanguage()
  const role = session?.user?.role
  const isOwner = role === 'OWNER'

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', assignedToId: '', dueAt: '' })

  useEffect(() => {
    if (session && role !== 'OWNER' && role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    if (session) fetchTasks()
    if (session && isOwner) fetchAdmins()
  }, [session])

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks', { credentials: 'include' })
      if (res.ok) setTasks(await res.json())
      else toast.error(t('tasks.loadFailed'))
    } catch {
      toast.error(t('tasks.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchAdmins() {
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAdmins(data.filter((u: any) => u.role === 'ADMIN'))
      }
    } catch {}
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('tasks.created'))
        setShowForm(false)
        setForm({ title: '', description: '', assignedToId: '', dueAt: '' })
        fetchTasks()
      } else {
        toast.error(data.error || t('tasks.createFailed'))
      }
    } catch {
      toast.error(t('tasks.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    if (status === 'COMPLETED') {
      if (!confirm(t('tasks.markCompleteConfirm'))) return
    }
    setBusyId(id)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success(status === 'COMPLETED' ? t('tasks.completed') : t('tasks.statusUpdated'))
        fetchTasks()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || t('tasks.completeFailed'))
      }
    } catch {
      toast.error(t('tasks.completeFailed'))
    } finally {
      setBusyId(null)
    }
  }

  async function deleteTask(id: string) {
    if (!confirm(t('tasks.deleteConfirm'))) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success(t('tasks.deleted'))
        fetchTasks()
      } else {
        toast.error(t('tasks.deleteFailed'))
      }
    } catch {
      toast.error(t('tasks.deleteFailed'))
    } finally {
      setBusyId(null)
    }
  }

  function effectiveStatus(task: TaskItem): 'PENDING' | 'STARTED' | 'COMPLETED' | 'OVERDUE' {
    if (task.status === 'COMPLETED') return 'COMPLETED'
    if (new Date(task.dueAt) < new Date()) return 'OVERDUE'
    return task.status === 'STARTED' ? 'STARTED' : 'PENDING'
  }

  function statusBadge(status: 'PENDING' | 'STARTED' | 'COMPLETED' | 'OVERDUE') {
    const cls = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200',
      STARTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border-indigo-200',
      COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200',
      OVERDUE: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200',
    }[status]
    const label = {
      PENDING: t('tasks.statusPending'), STARTED: t('tasks.statusStarted'),
      COMPLETED: t('tasks.statusCompleted'), OVERDUE: t('tasks.statusOverdue'),
    }[status]
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${cls}`}>{label}</span>
  }

  if (!session || loading) return <div className="p-8 text-center">{t('common.loading')}</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('tasks.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{isOwner ? t('tasks.subtitleOwner') : t('tasks.subtitleAdmin')}</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {t('tasks.createTask')}
          </button>
        )}
      </div>

      {isOwner && showForm && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('tasks.noAdminsYet')}</p>
          ) : (
            <form onSubmit={createTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">{t('tasks.taskTitle')}</label>
                <input
                  type="text" required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={t('tasks.taskTitlePlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">{t('tasks.description')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t('tasks.descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('tasks.assignTo')}</label>
                <select
                  required
                  value={form.assignedToId}
                  onChange={(e) => setForm((p) => ({ ...p, assignedToId: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-card"
                >
                  <option value="">{t('tasks.selectAdmin')}</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t('tasks.dueDate')}</label>
                <input
                  type="datetime-local" required
                  value={form.dueAt}
                  onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit" disabled={submitting}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? t('tasks.creating') : t('tasks.create')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ListTodo className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{isOwner ? t('tasks.noTasksOwner') : t('tasks.noTasksAdmin')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('tasks.taskTitle')}</th>
                  {isOwner && <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('tasks.assignedTo')}</th>}
                  {!isOwner && <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('tasks.createdBy')}</th>}
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('tasks.due')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('tasks.status')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => {
                  const status = effectiveStatus(task)
                  return (
                    <tr key={task.id} className="hover:bg-muted/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{task.description}</p>}
                      </td>
                      {isOwner && <td className="px-6 py-4 text-sm text-muted-foreground">{task.assignedTo.name}</td>}
                      {!isOwner && <td className="px-6 py-4 text-sm text-muted-foreground">{task.createdBy.name}</td>}
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDateTime(task.dueAt)}</span>
                      </td>
                      <td className="px-6 py-4">{statusBadge(status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {!isOwner && (
                            <select
                              value={task.status}
                              disabled={busyId === task.id}
                              onChange={(e) => updateStatus(task.id, e.target.value)}
                              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-muted/50 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                            >
                              <option value="PENDING">{t('tasks.statusPending')}</option>
                              <option value="STARTED">{t('tasks.statusStarted')}</option>
                              <option value="COMPLETED">{t('tasks.statusCompleted')}</option>
                            </select>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => deleteTask(task.id)}
                              disabled={busyId === task.id}
                              title={t('tasks.deleteTask')}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors inline-flex disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
