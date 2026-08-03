'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Plus, Trash2, FileText, ToggleLeft, ToggleRight, Loader2 
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface DocRequirement {
  id: string
  key: string
  label: string
  description: string | null
  accept: string
  type: string
  maxSize: string | null
  isRequired: boolean
  sortOrder: number
  active: boolean
}

export default function DocumentRequirementsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [requirements, setRequirements] = useState<DocRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const [form, setForm] = useState({
    key: '',
    label: '',
    description: '',
    accept: '.pdf,image/*',
    type: 'PDF',
    maxSize: '10MB',
    isRequired: false,
    sortOrder: 0,
  })

  const isOwner = session?.user?.role === 'OWNER'

  useEffect(() => {
    if (!isOwner) {
      router.push('/dashboard')
      return
    }
    fetchRequirements()
  }, [isOwner, router])

  async function fetchRequirements() {
    try {
      const res = await fetch('/api/document-requirements', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setRequirements(data)
      }
    } catch {
      toast.error('Failed to load requirements')
    } finally {
      setLoading(false)
    }
  }

  async function createRequirement() {
    if (!form.key || !form.label) {
      toast.error('Key and Label are required')
      return
    }
    try {
      const res = await fetch('/api/document-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })
      if (res.ok) {
        toast.success('Document requirement created')
        setShowAdd(false)
        setForm({ key: '', label: '', description: '', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: false, sortOrder: 0 })
        fetchRequirements()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to create')
      }
    } catch {
      toast.error('Failed to create')
    }
  }

  async function updateRequirement(id: string, data: Partial<DocRequirement>) {
    try {
      const res = await fetch(`/api/document-requirements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      if (res.ok) {
        toast.success('Updated')
        fetchRequirements()
      } else {
        toast.error('Failed to update')
      }
    } catch {
      toast.error('Failed to update')
    }
  }

  async function deleteRequirement(id: string) {
    if (!confirm('Delete this requirement? Existing documents will not be affected.')) return
    try {
      const res = await fetch(`/api/document-requirements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        toast.success('Deleted')
        fetchRequirements()
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  if (!isOwner) return null

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Requirements</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage required documents for student applications</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add New
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">New Document Requirement</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Key (unique ID) *</label>
              <input 
                value={form.key} 
                onChange={e => setForm({...form, key: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                placeholder="e.g. BIRTH_CERTIFICATE"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Label *</label>
              <input 
                value={form.label} 
                onChange={e => setForm({...form, label: e.target.value})}
                placeholder="e.g. Birth Certificate"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select 
                value={form.type} 
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="PDF">PDF</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Instructions for the agent..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Size</label>
              <input 
                value={form.maxSize} 
                onChange={e => setForm({...form, maxSize: e.target.value})}
                placeholder="e.g. 10MB"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={form.isRequired}
                  onChange={e => setForm({...form, isRequired: e.target.checked})}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span className="text-sm text-slate-700">Required</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={createRequirement} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 font-medium">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : requirements.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No document requirements configured</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-700 text-xs uppercase tracking-wider">Label</th>
                <th className="text-left px-6 py-3 font-medium text-slate-700 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-6 py-3 font-medium text-slate-700 text-xs uppercase tracking-wider">Max Size</th>
                <th className="text-center px-6 py-3 font-medium text-slate-700 text-xs uppercase tracking-wider">Required</th>
                <th className="text-right px-6 py-3 font-medium text-slate-700 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirements.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{req.label}</p>
                      <p className="text-xs text-slate-400">{req.description || req.key}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${
                      req.type === 'VIDEO' ? 'bg-rose-100 text-rose-700' :
                      req.type === 'IMAGE' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {req.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{req.maxSize || '-'}</td>
                  <td className="px-6 py-3 text-center">
                    <button 
                      onClick={() => updateRequirement(req.id, { isRequired: !req.isRequired })}
                      className="inline-flex"
                    >
                      {req.isRequired ? (
                        <ToggleRight className="w-6 h-6 text-indigo-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button 
                      onClick={() => deleteRequirement(req.id)}
                      className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
        <h4 className="text-sm font-bold text-indigo-900 mb-1">How it works</h4>
        <ul className="text-xs text-indigo-700 space-y-1 mt-1 list-disc list-inside">
          <li>Agents will see these categories when uploading documents for students</li>
          <li>Toggle "Required" to make a document mandatory before submission</li>
          <li>Changes apply immediately to new uploads — existing documents are not affected</li>
        </ul>
      </div>
    </div>
  )
}
