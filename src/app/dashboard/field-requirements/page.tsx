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
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface FieldReq {
  id: string
  key: string
  label: string
  section: string
  isRequired: boolean
  active: boolean
  sortOrder: number
}

export default function FieldRequirementsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [requirements, setRequirements] = useState<FieldReq[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const SECTIONS: Record<string, string> = {
    personal: t('settings.sectionPersonal'),
    address: t('settings.sectionAddress'),
    passport: t('settings.sectionPassport'),
    china_study: t('settings.sectionChinaStudy'),
    program: t('settings.sectionProgram'),
    education: t('settings.sectionEducation'),
    work: t('settings.sectionWork'),
    family: t('settings.sectionFamily'),
    sponsors: t('settings.sectionSponsors'),
  }

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
      toast.error(t('settings.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  async function createField() {
    if (!form.key || !form.label) {
      toast.error(t('settings.keyAndLabelRequired'))
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
        toast.success(t('settings.fieldCreatedToast'))
        setShowAdd(false)
        setForm({ key: '', label: '', section: 'personal', isRequired: true, sortOrder: 0 })
        fetchRequirements()
      } else {
        const err = await res.json()
        toast.error(err.error || t('settings.failedToCreate'))
      }
    } catch {
      toast.error(t('settings.failedToCreate'))
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
        toast.success(t('settings.updated'))
        fetchRequirements()
      } else {
        toast.error(t('settings.failedToUpdate'))
      }
    } catch {
      toast.error(t('settings.failedToUpdate'))
    }
  }

  async function deleteField(id: string) {
    if (!confirm(t('settings.deleteFieldRequirementConfirm'))) return
    try {
      const res = await fetch(`/api/field-requirements/${id}`, {
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

  const grouped = requirements.reduce((acc, req) => {
    if (!acc[req.section]) acc[req.section] = []
    acc[req.section].push(req)
    return acc
  }, {} as Record<string, FieldReq[]>)

  if (!isOwner) return null

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('settings.fieldRequirementsTitle')}</h1>
            <p className="text-muted-foreground mt-1">{t('settings.fieldRequirementsSubtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('settings.addField')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">{t('settings.newFieldRequirement')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.fieldKeyLabel')}</label>
              <input
                value={form.key}
                onChange={e => setForm({...form, key: e.target.value.replace(/\s/g, '_').toLowerCase()})}
                placeholder={t('settings.fieldKeyPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.labelRequired')}</label>
              <input
                value={form.label}
                onChange={e => setForm({...form, label: e.target.value})}
                placeholder={t('settings.fieldLabelPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('settings.sectionLabel')}</label>
              <select
                value={form.section}
                onChange={e => setForm({...form, section: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
                <span className="text-sm text-foreground">{t('common.required')}</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-xl text-sm text-foreground hover:bg-muted">
              {t('common.cancel')}
            </button>
            <button onClick={createField} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 font-medium">
              {t('settings.create')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            {t('common.loading')}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-border">
            <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>{t('settings.noFieldRequirements')}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([section, fields]) => (
            <div key={section} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="bg-muted px-6 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">{SECTIONS[section] || section}</h3>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {fields.map((req) => (
                    <tr key={req.id} className="hover:bg-muted transition">
                      <td className="px-6 py-3">
                        <p className="font-medium text-foreground">{req.label}</p>
                        <p className="text-xs text-muted-foreground">{req.key}</p>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => updateField(req.id, { isRequired: !req.isRequired })}
                          className="inline-flex"
                          title={req.isRequired ? t('settings.makeOptional') : t('settings.makeRequired')}
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
                          onClick={() => deleteField(req.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title={t('common.delete')}
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
            <h4 className="text-sm font-semibold text-indigo-900">{t('settings.howItWorksTitle')}</h4>
            <ul className="text-xs text-indigo-700 space-y-1 mt-1 list-disc list-inside">
              <li>{t('settings.fieldHowItWorks1')}</li>
              <li>{t('settings.fieldHowItWorks2')}</li>
              <li>{t('settings.fieldHowItWorks3')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}