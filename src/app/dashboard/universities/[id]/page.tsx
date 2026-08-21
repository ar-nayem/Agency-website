'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Trash2, Loader2, Video, FileImage, Pencil, Check, X, User, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface StudentTag {
  id: string
  fullName: string
  passportNo: string
  serialNumber: string | null
}

interface UniversityDoc {
  id: string
  originalName: string
  mimeType: string
  category: string
  createdAt: string
  uploadedBy: { id: string; name: string }
  student: StudentTag | null
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

interface PendingFile {
  key: string
  file: File
  category: string
  student: StudentTag | null
  status: 'pending' | 'uploading' | 'done' | 'error'
}

function StudentPicker({ value, onChange }: { value: StudentTag | null; onChange: (s: StudentTag | null) => void }) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StudentTag[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students/mentions?q=${encodeURIComponent(query.trim())}`, { credentials: 'include' })
        if (res.ok) setResults(await res.json())
      } catch {}
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  if (value) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-xs text-indigo-700 dark:text-indigo-400 max-w-full">
        <User className="w-3 h-3 shrink-0" />
        <span className="truncate">{value.fullName} · {value.passportNo}</span>
        <button onClick={() => onChange(null)} className="shrink-0 hover:text-indigo-900 dark:hover:text-indigo-200">
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t('universities.tagStudentPlaceholder')}
        className="w-full px-2 py-1 border border-border rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-56 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg">
          {results.map(s => (
            <button
              key={s.id}
              onMouseDown={() => { onChange(s); setQuery('') }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition"
            >
              <p className="font-medium text-foreground truncate">{s.fullName}</p>
              <p className="text-muted-foreground truncate">{s.passportNo}{s.serialNumber ? ` · ${s.serialNumber}` : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UniversityDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  const [data, setData] = useState<UniversityDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', country: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const [pending, setPending] = useState<PendingFile[]>([])
  const [batchCategory, setBatchCategory] = useState<string | null>(null)
  const [uploadingBatch, setUploadingBatch] = useState(false)

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

  function selectFiles(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setBatchCategory(category)
    setPending(prev => [
      ...prev,
      ...files.map(file => ({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        category,
        student: null as StudentTag | null,
        status: 'pending' as const,
      })),
    ])
    e.target.value = ''
  }

  function removePending(key: string) {
    setPending(prev => prev.filter(p => p.key !== key))
  }

  function setPendingStudent(key: string, student: StudentTag | null) {
    setPending(prev => prev.map(p => (p.key === key ? { ...p, student } : p)))
  }

  function closeBatch() {
    setPending([])
    setBatchCategory(null)
  }

  async function uploadBatch() {
    setUploadingBatch(true)
    let succeeded = 0
    let failed = 0

    for (const item of pending) {
      setPending(prev => prev.map(p => (p.key === item.key ? { ...p, status: 'uploading' } : p)))
      const formData = new FormData()
      formData.append('file', item.file)
      formData.append('category', item.category)
      if (item.student) formData.append('studentId', item.student.id)

      try {
        const res = await fetch(`/api/universities/${id}/documents`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (res.ok) {
          succeeded++
          setPending(prev => prev.map(p => (p.key === item.key ? { ...p, status: 'done' } : p)))
        } else {
          failed++
          setPending(prev => prev.map(p => (p.key === item.key ? { ...p, status: 'error' } : p)))
        }
      } catch {
        failed++
        setPending(prev => prev.map(p => (p.key === item.key ? { ...p, status: 'error' } : p)))
      }
    }

    setUploadingBatch(false)
    if (succeeded > 0) {
      toast.success(t('universities.batchUploadedCount').replace('{n}', String(succeeded)))
      fetchUniversity()
    }
    if (failed > 0) {
      toast.error(t('universities.batchFailedCount').replace('{n}', String(failed)))
      setPending(prev => prev.filter(p => p.status === 'error'))
    } else {
      closeBatch()
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
                        {doc.student && (
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate w-full text-center" title={`${doc.student.fullName} · ${doc.student.passportNo}`}>
                            {doc.student.fullName}
                          </p>
                        )}
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
                      <span className="text-xs text-muted-foreground text-center px-1">{t('universities.addFiles')}</span>
                      <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={e => selectFiles(e, cat.key)} />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">{t('universities.clickToUploadBatch')} {t(cat.labelKey)}</span>
                    <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={e => selectFiles(e, cat.key)} />
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {pending.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !uploadingBatch && closeBatch()}>
          <div className="bg-card rounded-2xl shadow-xl border border-border/60 w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t('universities.reviewBatchTitle')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {batchCategory && t(CATEGORIES.find(c => c.key === batchCategory)?.labelKey || '')} · {pending.length} {t('universities.files')}
                </p>
              </div>
              {!uploadingBatch && (
                <button onClick={closeBatch} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {pending.map(item => (
                <div key={item.key} className="flex items-center gap-2 p-2 rounded-xl border border-border">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1 min-w-0" title={item.file.name}>{item.file.name}</span>
                  <div className="w-40 shrink-0">
                    <StudentPicker value={item.student} onChange={s => setPendingStudent(item.key, s)} />
                  </div>
                  {item.status === 'pending' && !uploadingBatch && (
                    <button onClick={() => removePending(item.key)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {item.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />}
                  {item.status === 'done' && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {item.status === 'error' && <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-border shrink-0">
              <button
                onClick={closeBatch}
                disabled={uploadingBatch}
                className="px-4 py-2 border border-border rounded-xl text-sm text-foreground hover:bg-muted disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={uploadBatch}
                disabled={uploadingBatch || pending.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {uploadingBatch && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('universities.uploadAll')} ({pending.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
