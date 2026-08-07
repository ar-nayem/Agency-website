'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, CheckCircle, XCircle, Trash2, MessageSquare, Pencil, Download, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { formatMoney } from '@/src/lib/money'

export default function StudentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [financeSummary, setFinanceSummary] = useState<{ charged: number; spent: number } | null>(null)
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  useEffect(() => {
    fetchStudent()
    fetch(`/api/transactions?studentId=${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((txs: any[]) => {
        if (!Array.isArray(txs)) return
        let charged = 0, spent = 0
        for (const tx of txs) {
          if (tx.status !== 'COMPLETED') continue
          if (tx.type === 'INCOME') charged += tx.amount
          else spent += tx.amount
        }
        setFinanceSummary({ charged, spent })
      })
      .catch(() => {})
  }, [id])

  async function fetchStudent() {
    try {
      const res = await fetch(`/api/students/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setStudent(data)
    } catch {
      toast.error(t('students.failedLoadStudent'))
    } finally {
      setLoading(false)
    }
  }

  async function deleteDocument(docId: string) {
    if (!confirm(t('students.deleteDocumentConfirm'))) return
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) { toast.success(t('students.documentDeleted')); fetchStudent() }
      else toast.error(t('students.deleteFailed'))
    } catch { toast.error(t('students.deleteFailed')) }
  }

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) { toast.success(`${t('students.statusUpdated')} ${newStatus}`); fetchStudent() }
      else toast.error(t('students.updateFailed'))
    } catch { toast.error(t('students.updateFailed')) }
  }

  async function deleteStudent() {
    if (!confirm(t('students.deleteStudentConfirm'))) return
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) { toast.success(t('students.studentDeleted')); router.push('/dashboard/students') }
      else toast.error(t('students.deleteFailed'))
    } catch { toast.error(t('students.deleteFailed')) }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200'
    }
    return styles[status] || 'bg-muted text-foreground border-border'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: t('common.statusPending'),
      APPROVED: t('common.statusApproved'),
      REJECTED: t('common.statusRejected'),
    }
    return labels[status] || status
  }

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t('common.loading')}</div>
  if (!student) return <div className="p-10 text-center text-muted-foreground">{t('students.studentNotFound')}</div>

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4 min-w-0">
          <Link href="/dashboard/students" className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{student.fullName}</h1>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border shrink-0 ${getStatusBadge(student.status)}`}>
                {getStatusLabel(student.status)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm text-muted-foreground">{t('students.submittedBy')} <span className="font-medium text-foreground">{student.agent?.name}</span></span>
              {student.serialNumber && (
                <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {student.serialNumber}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Link
              href={`/dashboard/messages?with=${student.agentId}&studentId=${student.id}&studentName=${encodeURIComponent(student.fullName)}`}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-indigo-500/20"
            >
              <MessageSquare className="w-4 h-4" /> {t('students.messageAgent')}
            </Link>
          )}
          {isAdmin && student.status === 'PENDING' && (
            <>
              <button onClick={() => updateStatus('APPROVED')} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-emerald-500/20">
                <CheckCircle className="w-4 h-4" /> {t('students.approve')}
              </button>
              <button onClick={() => updateStatus('REJECTED')} className="px-4 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-rose-500/20">
                <XCircle className="w-4 h-4" /> {t('students.reject')}
              </button>
            </>
          )}
          <a
            href={`/api/students/${id}/export`}
            className="px-4 py-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl hover:bg-emerald-100 transition flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> {t('students.exportExcel')}
          </a>
          <Link
            href={`/dashboard/students/${id}/edit`}
            className="px-4 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition flex items-center gap-2 text-sm font-medium"
          >
            <Pencil className="w-4 h-4" /> {t('common.edit')}
          </Link>
          <button onClick={deleteStudent} className="px-4 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition text-sm font-medium">
            <Trash2 className="w-4 h-4 inline mr-1" /> {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal */}
          <Section title={t('studentFields.personalInformation')}>
            <InfoGrid items={[
              [t('studentFields.passportFamilyName'), student.passportFamilyName],
              [t('studentFields.givenName'), student.givenName],
              [t('studentFields.fullName'), student.fullName],
              [t('studentFields.gender'), student.gender],
              [t('studentFields.chineseName'), student.chineseName || '-'],
              [t('studentFields.maritalStatus'), student.maritalStatus],
              [t('studentFields.religion'), student.religion],
              [t('studentFields.occupation'), student.occupation],
              [t('studentFields.employerInstitution'), student.employerInstitution || '-'],
              [t('studentFields.nationality'), student.nationality],
              [t('studentFields.dateOfBirth'), student.dateOfBirth],
              [t('studentFields.countryOfBirth'), student.countryOfBirth],
              [t('studentFields.placeOfBirth'), student.placeOfBirth],
              [t('studentFields.yearsInHomeCountry'), student.yearsInHomeCountry || '-'],
              [t('studentFields.wechat'), student.wechat || '-'],
              [t('studentFields.chineseDescent'), student.chineseDescent],
              [t('studentFields.currentlyInChina'), student.currentlyInChina],
            ]} />
          </Section>

          {/* Address */}
          <Section title={t('studentFields.correspondenceAddress')}>
            <InfoGrid items={[
              [t('studentFields.homeAddress'), student.homeAddress || '-'],
              [t('studentFields.detailedAddress'), student.detailedAddress],
              [t('studentFields.cityProvince'), student.cityProvince],
              [t('studentFields.country'), student.country],
              [t('studentFields.zipcode'), student.zipcode],
              [t('studentFields.phoneMobile'), student.phoneMobile],
              [t('studentFields.mainEmail'), student.mainEmail],
            ]} />
          </Section>

          {/* Passport */}
          <Section title={t('studentFields.passportVisaSection')}>
            <InfoGrid items={[
              [t('studentFields.passportNo'), student.passportNo],
              [t('studentFields.passportExpiryDate'), student.passportExpiryDate],
              [t('studentFields.oldPassportNo'), student.oldPassportNo || '-'],
              [t('studentFields.oldPassportExpiry'), student.oldPassportExpiry || '-'],
            ]} />
          </Section>

          {/* China Study */}
          <Section title={t('studentFields.learningExperienceChina')}>
            <InfoGrid items={[
              [t('studentFields.studiedInChina'), student.studiedInChina],
              [t('studentFields.visaType'), student.visaType || '-'],
              [t('studentFields.chinaInstitution'), student.chinaInstitution || '-'],
              [t('studentFields.visaExpiryDate'), student.visaExpiryDate || '-'],
              [t('studentFields.studyDuration'), student.studyInChinaFrom && student.studyInChinaTo ? `${student.studyInChinaFrom} to ${student.studyInChinaTo}` : '-'],
            ]} />
          </Section>

          {/* Program */}
          <Section title={t('studentFields.programAppliedSection')}>
            <InfoGrid items={[
              [t('studentFields.programApplied'), student.programApplied || '-'],
            ]} />
          </Section>

          {/* Financial Sponsors */}
          <Section title={`${t('studentFields.financialSponsors')} (${student.financialSponsors?.length || 0})`}>
            {student.financialSponsors?.length ? student.financialSponsors.map((s: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-muted rounded-xl border border-border">
                <p className="font-semibold text-sm text-foreground">{s.name} — {s.relationship}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{t('studentFields.nationality')}: {s.nationality}</span>
                  <span>{t('studentFields.employer')}: {s.employer || '-'}</span>
                  <span>{t('studentFields.occupation')}: {s.occupation || '-'}</span>
                  <span>{t('studentFields.phone')}: {s.phone || '-'}</span>
                  <span>{t('studentFields.email')}: {s.email || '-'}</span>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">{t('studentFields.noSponsors')}</p>}
          </Section>

          {/* Education */}
          <Section title={`${t('studentFields.educationHistory')} (${student.educationHistory?.length || 0})`}>
            {student.educationHistory?.length ? student.educationHistory.map((edu: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-muted rounded-xl border border-border">
                <p className="font-semibold text-sm text-foreground">{edu.degree} — {edu.schoolName}</p>
                <p className="text-xs text-muted-foreground mt-1">{edu.yearFrom} to {edu.yearTo} | {t('studentFields.contactPerson')}: {edu.contactPerson || '-'}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">{t('studentFields.noEducationHistory')}</p>}
          </Section>

          {/* Work */}
          <Section title={`${t('studentFields.workExperience')} (${student.workExperience?.length || 0})`}>
            {student.workExperience?.length ? student.workExperience.map((w: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-muted rounded-xl border border-border">
                <p className="font-semibold text-sm text-foreground">{w.occupation} at {w.company}</p>
                <p className="text-xs text-muted-foreground mt-1">{w.yearFrom} to {w.yearTo} | {t('studentFields.reference')}: {w.reference || '-'}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">{t('studentFields.noWorkExperience')}</p>}
          </Section>

          {/* Family */}
          <Section title={`${t('studentFields.familyMembers')} (${student.familyMembers?.length || 0})`}>
            {student.familyMembers?.length ? student.familyMembers.map((f: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-muted rounded-xl border border-border">
                <p className="font-semibold text-sm text-foreground">{f.name} — {f.relationship}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{t('studentFields.nationality')}: {f.nationality}</span>
                  <span>{t('studentFields.employer')}: {f.employer || '-'}</span>
                  <span>{t('studentFields.occupation')}: {f.occupation || '-'}</span>
                  <span>{t('studentFields.phone')}: {f.phone || '-'}</span>
                  <span>{t('studentFields.email')}: {f.email || '-'}</span>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">{t('studentFields.noFamilyMembers')}</p>}
          </Section>

          {student.notes && (
            <Section title={t('studentFields.additionalNotes')}>
              <p className="text-sm text-muted-foreground">{student.notes}</p>
            </Section>
          )}
        </div>

        {/* Right: Finance + Documents Summary */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">{t('finance.title')}</h3>
              <Link href={`/dashboard/students/${id}/finance`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors">
                {t('finance.manageFinance')}
              </Link>
            </div>
            {financeSummary ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t('finance.charged')}</p>
                  <p className="text-lg font-bold text-emerald-600">{formatMoney(financeSummary.charged)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t('finance.spent')}</p>
                  <p className="text-lg font-bold text-rose-600">{formatMoney(financeSummary.spent)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            )}
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">{t('dashboard.documents')}</h3>
              <Link href={`/dashboard/students/${id}/documents`} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors">
                {t('students.manageDocuments')}
              </Link>
            </div>

            {student.documents?.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('students.noDocumentsUploaded')}</p>
            ) : (
              <div className="space-y-3">
                {/* Group by category */}
                {['PASSPORT_VISA', 'HIGHEST_DIPLOMA', 'TRANSCRIPTS', 'ENGLISH_CERT', 'PHYSICAL_EXAM', 'NON_CRIMINAL', 'FINANCIAL_SUPPORT', 'SELF_INTRO_VIDEO', 'OTHER'].map((catKey) => {
                  const catDocs = student.documents.filter((d: any) => d.category === catKey)
                  if (catDocs.length === 0) return null
                  const catLabels: Record<string, string> = {
                    PASSPORT_VISA: t('studentFields.docPassportVisa'),
                    HIGHEST_DIPLOMA: t('studentFields.docHighestDiploma'),
                    TRANSCRIPTS: t('studentFields.docTranscripts'),
                    ENGLISH_CERT: t('studentFields.docEnglishCert'),
                    PHYSICAL_EXAM: t('studentFields.docPhysicalExam'),
                    NON_CRIMINAL: t('studentFields.docNonCriminal'),
                    FINANCIAL_SUPPORT: t('studentFields.docFinancialSupport'),
                    SELF_INTRO_VIDEO: t('studentFields.docSelfIntroVideo'),
                    OTHER: t('studentFields.docOther')
                  }
                  return (
                    <div key={catKey} className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm text-foreground">{catLabels[catKey]}</span>
                      <span className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 px-2 py-0.5 rounded-md font-semibold border border-indigo-100">{catDocs.length}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
            <h4 className="text-sm font-semibold text-indigo-900 mb-1">{t('students.uploadDocumentsTitle')}</h4>
            <p className="text-xs text-indigo-600 mb-3">{t('students.uploadDocumentsHint')}</p>
            <Link href={`/dashboard/students/${id}/documents`} className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition font-medium shadow-sm shadow-indigo-500/20">
              {t('students.goToDocuments')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
      <h3 className="text-base font-semibold text-foreground mb-4 pb-3 border-b border-border">{title}</h3>
      {children}
    </div>
  )
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{label}</p>
          <p className="font-medium text-foreground mt-0.5">{value || '-'}</p>
        </div>
      ))}
    </div>
  )
}