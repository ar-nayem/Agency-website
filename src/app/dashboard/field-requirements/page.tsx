'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, 
  Loader2, ListChecks, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface FieldReq {
  id: string
  key: string
  label: string
  section: string
  isRequired: boolean
  active: boolean
  sortOrder: number
}

const SECTIONS: Record<string, string> = {
  personal: 'Personal Information',
  address: 'Correspondence Address',
  passport: 'Passport & Visa',
  china_study: 'Learning Experience in China',
  program: 'Program Applied',
  education: 'Education Background',
  work: 'Work Experience',
  family: 'Family Members',
  sponsors: 'Financial Sponsors',
}

export default function FieldRequirementsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [requirements, setRequirements] = useState<FieldReq[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const [form, setForm] = useState({
    key: '',
    label: '',
    section: 'personal',
    isRequired: true,
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
      const res = await fetch('/api/field-requirements', { credentials: 'include' })
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

  async function createField() {
    if (!form.key || !form.label) {
      toast.error('Key and Label are required')
      return
    }
    try {
      const res = await fetch('/api/field-requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      })
      if (res.ok) {
        toast.success('Field requirement created')
        setShowAdd(false)
        setForm({ key: '', label: '', section: 'personal', isRequired: true, sortOrder: 0 })
        fetchRequirements()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to create')
      }
    } catch {
      toast.error('Failed to create')
    }
  }

  async function updateField(id: string, data: Partial<FieldReq>) {
    try {
      const res = await fetch(`/api/field-requirements/${id}`, {
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

  async function deleteField(id: string) {
    if (!confirm('Delete this field requirement?')) return
    try {
      const res = await fetch(`/api/field-requirements/${id}`, {
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

  const grouped = requirements.reduce((acc, req) => {
    if (!acc[req.section]) acc[req.section] = []
    acc[req.section].push(req)
    return acc
  }, {} as Record<string, FieldReq[]>)

  if (!isOwner) return null

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Field Requirements</h1>
            <p className="text-slate-500 mt-1">Configure which student information fields are required</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">New Field Requirement</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Key (unique) *</label>
              <input 
                value={form.key} 
                onChange={e => setForm({...form, key: e.target.value.replace(/\s/g, '_').toLowerCase()})}
                placeholder="e.g. full_name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Label *</label>
              <input 
                value={form.label} 
                onChange={e => setForm({...form, label: e.target.value})}
                placeholder="e.g. Full Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <select 
                value={form.section} 
                onChange={e => setForm({...form, section: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {Object.entries(SECTIONS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
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
            <button onClick={createField} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 font-medium">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No field requirements configured</p>
          </div>
        ) : (
          Object.entries(grouped).map(([section, fields]) => (
            <div key={section} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">{SECTIONS[section] || section}</h3>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {fields.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-900">{req.label}</p>
                        <p className="text-xs text-slate-400">{req.key}</p>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button 
                          onClick={() => updateField(req.id, { isRequired: !req.isRequired })}
                          className="inline-flex"
                          title={req.isRequired ? 'Make optional' : 'Make required'}
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
                          onClick={() => deleteField(req.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-indigo-900">How it works</h4>
            <ul className="text-xs text-indigo-700 space-y-1 mt-1 list-disc list-inside">
              <li>Toggle the switch to make a field required or optional in the student form</li>
              <li>Changes apply immediately — agents will see updated validation rules</li>
              <li>Existing student data is not affected by these settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
