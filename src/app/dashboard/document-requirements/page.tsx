'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, FileText, ToggleLeft, ToggleRight, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

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
  const { t } = useLanguage()
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
      toast.error(t('settings.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  async function createRequirement() {
    if (!form.key || !form.label) {
      toast.error(t('settings.keyAndLabelRequired'))
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
        toast.success(t('settings.docCreatedToast'))
        setShowAdd(false)
        setForm({ key: '', label: '', description: '', accept: '.pdf,image/*', type: 'PDF', maxSize: '10MB', isRequired: false, sortOrder: 0 })
        fetchRequirements()
      } else {
        const err = await res.json()
        toast.error(err.error || t('settings.failedToCreate'))
      }
    } catch {
      toast.error(t('settings.failedToCreate'))
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
        toast.success(t('settings.updated'))
        fetchRequirements()
      } else {
        toast.error(t('settings.failedToUpdate'))
      }
    } catch {
      toast.error(t('settings.failedToUpdate'))
    }
  }

  async function deleteRequirement(id: string) {
    if (!confirm(t('settings.deleteDocRequirementConfirm'))) return
    try {
      const res = await fetch(`/api/document-requirements/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        toast.success(t('settings.deleted'))
        fetchRequirements()
      } else {
        toast.error(t('settings.failedToDelete'))
      }
    } catch {
      toast.error(t('settings.failedToDelete'))
    }
  }

  if (!isOwner) return null

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-muted rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('settings.docRequirementsTitle')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('settings.docRequirementsSubtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('settings.addNew')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">{t('settings.newDocRequirement')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.docKeyLabel')}</label>
              <input
                value={form.key}
                onChange={e => setForm({...form, key: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                placeholder={t('settings.docKeyPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.labelRequired')}</label>
              <input
                value={form.label}
                onChange={e => setForm({...form, label: e.target.value})}
                placeholder={t('settings.docLabelPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.typeLabel')}</label>
              <select
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="PDF">{t('settings.typePdf')}</option>
                <option value="IMAGE">{t('settings.typeImage')}</option>
                <option value="VIDEO">{t('settings.typeVideo')}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.descriptionLabel')}</label>
              <input
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder={t('settings.docDescriptionPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.maxSizeLabel')}</label>
              <input
                value={form.maxSize}
                onChange={e => setForm({...form, maxSize: e.target.value})}
                placeholder={t('settings.maxSizePlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                <span className="text-sm text-foreground">{t('common.required')}</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-xl text-sm text-foreground hover:bg-muted">
              {t('common.cancel')}
            </button>
            <button onClick={createRequirement} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 font-medium">
              {t('settings.create')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            {t('common.loading')}
          </div>
        ) : requirements.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{t('settings.noDocRequirements')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-foreground text-xs uppercase tracking-wider">{t('settings.labelHeader')}</th>
                <th className="text-left px-6 py-3 font-medium text-foreground text-xs uppercase tracking-wider">{t('settings.typeLabel')}</th>
                <th className="text-left px-6 py-3 font-medium text-foreground text-xs uppercase tracking-wider">{t('settings.maxSizeLabel')}</th>
                <th className="text-center px-6 py-3 font-medium text-foreground text-xs uppercase tracking-wider">{t('common.required')}</th>
                <th className="text-right px-6 py-3 font-medium text-foreground text-xs uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requirements.map((req) => (
                <tr key={req.id} className="hover:bg-muted transition">
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-foreground">{req.label}</p>
                      <p className="text-xs text-muted-foreground">{req.description || req.key}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${
                      req.type === 'VIDEO' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' :
                      req.type === 'IMAGE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' :
                      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
                    }`}>
                      {req.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{req.maxSize || '-'}</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => updateRequirement(req.id, { isRequired: !req.isRequired })}
                      className="inline-flex"
                    >
                      {req.isRequired ? (
                        <ToggleRight className="w-6 h-6 text-indigo-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => deleteRequirement(req.id)}
                      className="text-rose-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                      title={t('common.delete')}
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
        <h4 className="text-sm font-bold text-indigo-900 mb-1">{t('settings.howItWorksTitle')}</h4>
        <ul className="text-xs text-indigo-700 space-y-1 mt-1 list-disc list-inside">
          <li>{t('settings.docHowItWorks1')}</li>
          <li>{t('settings.docHowItWorks2')}</li>
          <li>{t('settings.docHowItWorks3')}</li>
        </ul>
      </div>
    </div>
  )
}