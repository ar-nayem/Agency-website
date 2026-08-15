'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import StudentApplicationForm from '@/src/components/StudentApplicationForm'

export default function NewStudentPage() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/students" className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-muted rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('studentForm.applicationFormTitle')}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t('studentForm.completeAllSections')}</p>
          </div>
        </div>
      </div>

      <StudentApplicationForm
        mode="staff"
        endpoints={{
          createStudent: '/api/students',
          uploadDocument: '/api/documents',
          documentRequirements: '/api/document-requirements',
          fieldRequirements: '/api/field-requirements',
        }}
        onSuccess={(s) => {
          toast.success(t('studentForm.studentCreatedWithDocs').replace('{count}', String(s.uploadedCount ?? 0)))
          router.push('/dashboard/students')
        }}
      />
    </div>
  )
}
