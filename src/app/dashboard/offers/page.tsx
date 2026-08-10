'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, Megaphone, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Offer = {
  id: string
  title: string
  description: string
  imageUrl: string | null
  startDate: string
  endDate: string | null
  isActive: boolean
  status: 'RUNNING' | 'UPCOMING' | 'EXPIRED' | 'PAUSED'
  createdBy?: { name: string }
}

const STATUS_STYLES: Record<Offer['status'], string> = {
  RUNNING: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  UPCOMING: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  EXPIRED: 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400',
  PAUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
}

function toDateInput(v: string | null) {
  return v ? v.slice(0, 10) : ''
}

export default function OffersPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Offer | 'new' | null>(null)
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '', startDate: '', endDate: '', isActive: true })
  const [saving, setSaving] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/offers?all=true', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setOffers(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Failed to load offers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ title: '', description: '', imageUrl: '', startDate: toDateInput(new Date().toISOString()), endDate: '', isActive: true })
    setEditing('new')
  }

  function openEdit(offer: Offer) {
    setForm({
      title: offer.title,
      description: offer.description,
      imageUrl: offer.imageUrl || '',
      startDate: toDateInput(offer.startDate),
      endDate: toDateInput(offer.endDate),
      isActive: offer.isActive,
    })
    setEditing(offer)
  }

  async function save() {
    if (!form.title.trim() || !form.description.trim() || !form.startDate) {
      toast.error('Title, description and start date are required')
      return
    }
    setSaving(true)
    try {
      const isNew = editing === 'new'
      const url = isNew ? '/api/offers' : `/api/offers/${(editing as Offer).id}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          imageUrl: form.imageUrl || null,
          startDate: form.startDate,
          endDate: form.endDate || null,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(isNew ? 'Offer created' : 'Offer updated')
      setEditing(null)
      load()
    } catch {
      toast.error('Failed to save offer')
    } finally {
      setSaving(false)
    }
  }

  async function remove(offer: Offer) {
    if (!confirm(`Delete "${offer.title}"? This can't be undone.`)) return
    try {
      const res = await fetch(`/api/offers/${offer.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error()
      toast.success('Offer deleted')
      load()
    } catch {
      toast.error('Failed to delete offer')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
            <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Offers</h1>
            <p className="text-sm text-muted-foreground">Running and upcoming offers, shown to visitors and staff via the chat assistant.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New offer
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : offers.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-10 text-center">
          No offers yet.
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => (
            <div key={offer.id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{offer.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[offer.status]}`}>{offer.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(offer.startDate).toLocaleDateString()}
                  {offer.endDate ? ` – ${new Date(offer.endDate).toLocaleDateString()}` : ' – ongoing'}
                  {offer.createdBy?.name ? ` · by ${offer.createdBy.name}` : ''}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(offer)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors" aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(offer)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !saving && setEditing(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{editing === 'new' ? 'New offer' : 'Edit offer'}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Image URL (optional)</label>
                <input
                  value={form.imageUrl}
                  onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Start date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">End date (optional)</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                Active (visible to visitors and the chat assistant)
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
