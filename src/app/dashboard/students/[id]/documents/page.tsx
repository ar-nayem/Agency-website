'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, FileText, Trash2, Loader2, Video, FileImage } from 'lucide-react'
import toast from 'react-hot-toast'

interface DocCategory {
  id: string
  key: string
  label: string
  description?: string
  accept: string
  type: string
  maxSize?: string
  isRequired: boolean
}

export default function DocumentsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [student, setStudent] = useState<any>(null)
  const [categories, setCategories] = useState<DocCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchStudent()
    fetchCategories()
  }, [id])

  async function fetchStudent() {
    try {
      const res = await fetch(`/api/students/${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setStudent(data)
    } catch {
      toast.error('Failed to load student')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/document-requirements', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch {
      toast.error('Failed to load document categories')
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, category: DocCategory) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCategory(category.key)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('studentId', id as string)
    formData.append('type', category.type)
    formData.append('category', category.key)

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (res.ok) {
        toast.success(`${category.label} uploaded`)
        fetchStudent()
      } else {
        toast.error('Upload failed')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingCategory(null)
      e.target.value = ''
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm('Delete this document?')) return
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success('Document deleted')
        fetchStudent()
      } else {
        toast.error('Delete failed')
      }
    } catch {
      toast.error('Delete failed')
    }
  }

  function getDocsByCategory(categoryKey: string) {
    return student?.documents?.filter((d: any) => d.category === categoryKey) || []
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>
  if (!student) return <div className="p-8 text-center">Student not found</div>

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/students/${id}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
          <p className="text-gray-500 mt-1">{student.fullName}</p>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const docs = getDocsByCategory(cat.key)
          const isUploading = uploadingCategory === cat.key

          return (
            <div key={cat.key} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Category Header */}
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  {cat.label}
                  {cat.isRequired && <span className="text-red-500 ml-1">*</span>}
                </h3>
                {cat.description && (
                  <p className="text-xs text-gray-500 mt-1">{cat.description}</p>
                )}
              </div>

              {/* Upload Area */}
              <div className="p-5">
                {docs.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {docs.map((doc: any) => (
                      <div key={doc.id} className="flex flex-col items-center w-28">
                        <div className="w-20 h-24 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
                          {doc.type === 'VIDEO' ? (
                            <Video className="w-8 h-8 text-red-400" />
                          ) : doc.type === 'IMAGE' ? (
                            <FileImage className="w-8 h-8 text-blue-400" />
                          ) : (
                            <FileText className="w-8 h-8 text-red-400" />
                          )}
                        </div>
                        <p className="text-xs text-blue-600 mt-2 text-center truncate w-full" title={doc.originalName}>
                          {doc.originalName.length > 20 ? doc.originalName.substring(0, 20) + '...' : doc.originalName}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(doc.createdAt).toISOString().split('T')[0]}</p>
                        <div className="flex gap-2 mt-1">
                          <a href={`/uploads/${doc.filename}`} download className="text-xs text-blue-600 hover:underline">Download</a>
                          <button onClick={() => deleteDocument(doc.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </div>
                      </div>
                    ))}
                    {/* Add more button */}
                    <label className="w-28 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Add More</span>
                      <input type="file" accept={cat.accept} className="hidden" onChange={(e) => handleUpload(e, cat)} />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Click to upload {cat.label}</span>
                        {cat.maxSize && <span className="text-xs text-gray-400 mt-1">Max size: {cat.maxSize}</span>}
                      </>
                    )}
                    <input type="file" accept={cat.accept} className="hidden" onChange={(e) => handleUpload(e, cat)} disabled={isUploading} />
                  </label>
                )}
              </div>
            </div>
          )
        })}

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No document categories configured</p>
          </div>
        )}
      </div>

      {/* Done Button */}
      <div className="mt-8 flex justify-end">
        <Link href={`/dashboard/students/${id}`} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Done
        </Link>
      </div>
    </div>
  )
}
