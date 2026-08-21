'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Trash2, Loader2, Video, FileImage, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface UniversityDoc {
  id: string
  originalName: string
  mimeType: string
  category: string
  createdAt: string
  uploadedBy: { id: string; name: string }
}

interface UniversityDetail {
  id: string
  name: string
  country: string | null
  notes: string | null
  documents: UniversityDoc[]
}

const CATEGORIES = [
  { key: 'ADMISSION_LETTER', labelKey: 'universities.admissionLetters' },
  { key: 'JW', labelKey: 'universities.jw' },
  { key: 'OTHER', labelKey: 'universities.other' },
]

export default function UniversityDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  const [data, setData] = useState<UniversityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', country: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/dashboard')
      return
    }
    if (session) fetchUniversity()
  }, [id, session])

  async function fetchUniversity() {
    try {
      const res = await fetch(`/api/universities/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      const d = await res.json()
      setData(d)
      setEditForm({ name: d.name, country: d.country || '', notes: d.notes || '' })
    } catch {
      toast.error(t('universities.failedLoadOne'))
    } finally {
      setLoading(false)
    }
  }

  async function saveEdit() {
    setSaving(true)
    try {
      const res = await fetch(`/api/universities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast.success(t('universities.updated'))
        setEditing(false)
        fetchUniversity()
      } else {
        toast.error(t('universities.failedUpdate'))
      }
    } catch {
      toast.error(t('universities.failedUpdate'))
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCategory(category)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)

    try {
      const res = await fetch(`/api/universities/${id}/documents`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (res.ok) {
        toast.success(t('universities.documentUploaded'))
        fetchUniversity()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || t('universities.uploadFailed'))
      }
    } catch {
      toast.error(t('universities.uploadFailed'))
    } finally {
      setUploadingCategory(null)
      e.target.value = ''
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm(t('universities.deleteDocumentConfirm'))) return
    try {
      const res = await fetch(`/api/universities/${id}/documents/${docId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success(t('universities.documentDeleted'))
        fetchUniversity()
      } else {
        toast.error(t('universities.deleteDocumentFailed'))
      }
    } catch {
      toast.error(t('universities.deleteDocumentFailed'))
    }
  }

  function docsFor(category: string) {
    return data?.documents.filter(d => d.category === category) || []
  }

  function fileIcon(mimeType: string) {
    if (mimeType.startsWith('video/')) return <Video className="w-8 h-8 text-red-400" />
    if (mimeType.startsWith('image/')) return <FileImage className="w-8 h-8 text-blue-400" />
    return <FileText className="w-8 h-8 text-red-400" />
  }

  if (!isAdmin) return null
  if (loading) return <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>
  if (!data) return <div className="p-8 text-center text-muted-foreground">{t('universities.notFound')}</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/universities" className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                className="px-3 py-1.5 border border-border rounded-lg text-sm font-semibold"
                placeholder={t('universities.name')}
              />
              <input
                value={editForm.country}
                onChange={e => setEditForm(p => ({ ...p, country: e.target.value }))}
                className="px-3 py-1.5 border border-border rounded-lg text-sm"
                placeholder={t('universities.countryPlaceholder')}
              />
              <input
                value={editForm.notes}
                onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                className="px-3 py-1.5 border border-border rounded-lg text-sm"
                placeholder={t('universities.notesPlaceholder')}
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{data.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.country || t('universities.noCountry')}
                {data.notes && ` · ${data.notes}`}
              </p>
            </>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={saveEdit} disabled={saving} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => setEditing(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition shrink-0">
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {CATEGORIES.map(cat => {
          const docs = docsFor(cat.key)
          const isUploading = uploadingCategory === cat.key

          return (
            <div key={cat.key} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="bg-muted px-5 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground">{t(cat.labelKey)}</h3>
              </div>
              <div className="p-5">
                {docs.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex flex-col items-center w-28">
                        <div className="w-20 h-24 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                          {fileIcon(doc.mimeType)}
                        </div>
                        <p className="text-xs text-blue-600 mt-2 text-center truncate w-full" title={doc.originalName}>
                          {doc.originalName.length > 20 ? doc.originalName.substring(0, 20) + '...' : doc.originalName}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(doc.createdAt).toISOString().split('T')[0]}</p>
                        <p className="text-[10px] text-muted-foreground truncate w-full text-center" title={doc.uploadedBy.name}>{doc.uploadedBy.name}</p>
                        <div className="flex gap-2 mt-1">
                          <a href={`/api/universities/${id}/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{t('common.view')}</a>
                          <a href={`/api/universities/${id}/documents/${doc.id}/file?download=${encodeURIComponent(doc.originalName)}`} download={doc.originalName} className="text-xs text-blue-600 hover:underline">{t('common.download')}</a>
                          <button onClick={() => deleteDocument(doc.id)} className="text-xs text-red-500 hover:underline">{t('common.delete')}</button>
                        </div>
                      </div>
                    ))}
                    <label className="w-28 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition">
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">{t('students.addMore')}</span>
                      <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleUpload(e, cat.key)} />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">{t('students.clickToUpload')} {t(cat.labelKey)}</span>
                      </>
                    )}
                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => handleUpload(e, cat.key)} disabled={isUploading} />
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
