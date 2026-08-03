'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle, XCircle, Trash2, MessageSquare, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'

export default function StudentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  useEffect(() => {
    fetchStudent()
  }, [id])

  async function fetchStudent() {
    try {
      const res = await fetch(`/api/students/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setStudent(data)
    } catch {
      toast.error('Failed to load student')
    } finally {
      setLoading(false)
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm('Delete this document?')) return
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) { toast.success('Document deleted'); fetchStudent() }
      else toast.error('Delete failed')
    } catch { toast.error('Delete failed') }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) { toast.success(`Status updated to ${newStatus}`); fetchStudent() }
      else toast.error('Update failed')
    } catch { toast.error('Update failed') }
  }

  async function deleteStudent() {
    if (!confirm('Delete this student and all documents?')) return
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) { toast.success('Student deleted'); router.push('/dashboard/students') }
      else toast.error('Delete failed')
    } catch { toast.error('Delete failed') }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-700 border-rose-200'
    }
    return styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  if (loading) return <div className="p-10 text-center text-slate-400">Loading...</div>
  if (!student) return <div className="p-10 text-center text-slate-400">Student not found</div>

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/students" className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{student.fullName}</h1>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(student.status)}`}>
                {student.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm text-slate-500">Submitted by <span className="font-medium text-slate-700">{student.agent?.name}</span></span>
              {student.serialNumber && (
                <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {student.serialNumber}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link 
              href={`/dashboard/messages?with=${student.agentId}&studentId=${student.id}&studentName=${encodeURIComponent(student.fullName)}`}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-indigo-500/20"
            >
              <MessageSquare className="w-4 h-4" /> Message Agent
            </Link>
          )}
          {isAdmin && student.status === 'PENDING' && (
            <>
              <button onClick={() => updateStatus('APPROVED')} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-emerald-500/20">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => updateStatus('REJECTED')} className="px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-rose-500/20">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          <Link
            href={`/dashboard/students/${id}/edit`}
            className="px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition flex items-center gap-2 text-sm font-medium"
          >
            <Pencil className="w-4 h-4" /> Edit
          </Link>
          <button onClick={deleteStudent} className="px-4 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition text-sm font-medium">
            <Trash2 className="w-4 h-4 inline mr-1" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal */}
          <Section title="Personal Information">
            <InfoGrid items={[
              ['Passport Family Name', student.passportFamilyName],
              ['Given Name', student.givenName],
              ['Full Name', student.fullName],
              ['Gender', student.gender],
              ['Chinese Name', student.chineseName || '-'],
              ['Marital Status', student.maritalStatus],
              ['Religion', student.religion],
              ['Occupation', student.occupation],
              ['Employer/Institution', student.employerInstitution || '-'],
              ['Nationality', student.nationality],
              ['Date of Birth', student.dateOfBirth],
              ['Country of Birth', student.countryOfBirth],
              ['Place of Birth', student.placeOfBirth],
              ['Years in Home Country', student.yearsInHomeCountry || '-'],
              ['WeChat', student.wechat || '-'],
              ['Chinese Descent', student.chineseDescent],
              ['Currently in China', student.currentlyInChina],
            ]} />
          </Section>

          {/* Address */}
          <Section title="Correspondence Address">
            <InfoGrid items={[
              ['Home Address', student.homeAddress || '-'],
              ['Detailed Address', student.detailedAddress],
              ['City/Province', student.cityProvince],
              ['Country', student.country],
              ['Zipcode', student.zipcode],
              ['Phone/Mobile', student.phoneMobile],
              ['Main Email', student.mainEmail],
            ]} />
          </Section>

          {/* Passport */}
          <Section title="Passport & Visa">
            <InfoGrid items={[
              ['Passport No.', student.passportNo],
              ['Passport Expiry', student.passportExpiryDate],
              ['Old Passport No.', student.oldPassportNo || '-'],
              ['Old Passport Expiry', student.oldPassportExpiry || '-'],
            ]} />
          </Section>

          {/* China Study */}
          <Section title="Learning Experience in China">
            <InfoGrid items={[
              ['Studied in China', student.studiedInChina],
              ['Visa Type', student.visaType || '-'],
              ['Institution in China', student.chinaInstitution || '-'],
              ['Visa Expiry', student.visaExpiryDate || '-'],
              ['Study Duration', student.studyInChinaFrom && student.studyInChinaTo ? `${student.studyInChinaFrom} to ${student.studyInChinaTo}` : '-'],
            ]} />
          </Section>

          {/* Program */}
          <Section title="Program Applied">
            <InfoGrid items={[
              ['Program', student.programApplied || '-'],
            ]} />
          </Section>

          {/* Financial Sponsors */}
          <Section title={`Financial Sponsors (${student.financialSponsors?.length || 0})`}>
            {student.financialSponsors?.length ? student.financialSponsors.map((s: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-sm text-slate-900">{s.name} — {s.relationship}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-600">
                  <span>Nationality: {s.nationality}</span>
                  <span>Employer: {s.employer || '-'}</span>
                  <span>Occupation: {s.occupation || '-'}</span>
                  <span>Phone: {s.phone || '-'}</span>
                  <span>Email: {s.email || '-'}</span>
                </div>
              </div>
            )) : <p className="text-sm text-slate-400">No sponsors recorded</p>}
          </Section>

          {/* Education */}
          <Section title={`Education History (${student.educationHistory?.length || 0})`}>
            {student.educationHistory?.length ? student.educationHistory.map((edu: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-sm text-slate-900">{edu.degree} — {edu.schoolName}</p>
                <p className="text-xs text-slate-500 mt-1">{edu.yearFrom} to {edu.yearTo} | Contact: {edu.contactPerson || '-'}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No education history</p>}
          </Section>

          {/* Work */}
          <Section title={`Work Experience (${student.workExperience?.length || 0})`}>
            {student.workExperience?.length ? student.workExperience.map((w: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-sm text-slate-900">{w.occupation} at {w.company}</p>
                <p className="text-xs text-slate-500 mt-1">{w.yearFrom} to {w.yearTo} | Reference: {w.reference || '-'}</p>
              </div>
            )) : <p className="text-sm text-slate-400">No work experience</p>}
          </Section>

          {/* Family */}
          <Section title={`Family Members (${student.familyMembers?.length || 0})`}>
            {student.familyMembers?.length ? student.familyMembers.map((f: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-semibold text-sm text-slate-900">{f.name} — {f.relationship}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-600">
                  <span>Nationality: {f.nationality}</span>
                  <span>Employer: {f.employer || '-'}</span>
                  <span>Occupation: {f.occupation || '-'}</span>
                  <span>Phone: {f.phone || '-'}</span>
                  <span>Email: {f.email || '-'}</span>
                </div>
              </div>
            )) : <p className="text-sm text-slate-400">No family members recorded</p>}
          </Section>

          {student.notes && (
            <Section title="Additional Notes">
              <p className="text-sm text-slate-600">{student.notes}</p>
            </Section>
          )}
        </div>

        {/* Right: Documents Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Documents</h3>
              <Link href={`/dashboard/students/${id}/documents`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors">
                Manage Documents
              </Link>
            </div>
            
            {student.documents?.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded</p>
            ) : (
              <div className="space-y-3">
                {/* Group by category */}
                {['PASSPORT_VISA', 'HIGHEST_DIPLOMA', 'TRANSCRIPTS', 'ENGLISH_CERT', 'PHYSICAL_EXAM', 'NON_CRIMINAL', 'FINANCIAL_SUPPORT', 'SELF_INTRO_VIDEO', 'OTHER'].map((catKey) => {
                  const catDocs = student.documents.filter((d: any) => d.category === catKey)
                  if (catDocs.length === 0) return null
                  const catLabels: Record<string, string> = {
                    PASSPORT_VISA: 'Passport & Visa',
                    HIGHEST_DIPLOMA: 'Highest Diploma',
                    TRANSCRIPTS: 'Transcripts',
                    ENGLISH_CERT: 'English Certificate',
                    PHYSICAL_EXAM: 'Physical Exam',
                    NON_CRIMINAL: 'Non-criminal Record',
                    FINANCIAL_SUPPORT: 'Financial Support',
                    SELF_INTRO_VIDEO: 'Self-intro Video',
                    OTHER: 'Other'
                  }
                  return (
                    <div key={catKey} className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm text-slate-700">{catLabels[catKey]}</span>
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold border border-indigo-100">{catDocs.length}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
            <h4 className="text-sm font-semibold text-indigo-900 mb-1">Upload Documents</h4>
            <p className="text-xs text-indigo-600 mb-3">Click "Manage Documents" to upload documents in categories.</p>
            <Link href={`/dashboard/students/${id}/documents`} className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition font-medium shadow-sm shadow-indigo-500/20">
              Go to Documents
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">{title}</h3>
      {children}
    </div>
  )
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{label}</p>
          <p className="font-medium text-slate-900 mt-0.5">{value || '-'}</p>
        </div>
      ))}
    </div>
  )
}
