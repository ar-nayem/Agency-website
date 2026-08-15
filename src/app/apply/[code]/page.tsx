'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { GraduationCap, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/src/components/LanguageToggle'
import StudentApplicationForm, { DocCategory, FieldReq } from '@/src/components/StudentApplicationForm'

interface IntakeInfo {
  agentName: string
  organizationName: string
  docCategories: DocCategory[]
  fieldRequirements: FieldReq[]
}

export default function ApplyPage() {
  const { code } = useParams()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState<IntakeInfo | null>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!code) return
    fetch(`/api/public/intake/${code}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => setInfo(ok ? data : null))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [code])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{t('intake.pageTitle')}</h1>
              {info && (
                <p className="text-muted-foreground text-sm mt-0.5">
                  {t('intake.applyingThrough')} <span className="font-medium text-foreground">{info.agentName}</span> {t('intake.applyingThroughAt')} <span className="font-medium text-foreground">{info.organizationName}</span>
                </p>
              )}
            </div>
          </div>
          <LanguageToggle />
        </div>

        {loading ? (
          <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-16 flex justify-center">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : !info ? (
          <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-10 max-w-md mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-2xl mb-1">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">{t('intake.invalidLinkTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('intake.invalidLinkMessage')}</p>
          </div>
        ) : submitted ? (
          <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-10 max-w-md mx-auto text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-2xl mb-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">{t('intake.submittedTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('intake.submittedMessage')}</p>
          </div>
        ) : (
          <StudentApplicationForm
            mode="public"
            endpoints={{
              createStudent: `/api/public/intake/${code}`,
              uploadDocument: `/api/public/intake/${code}/documents`,
            }}
            initialDocCategories={info.docCategories}
            initialFieldRequirements={info.fieldRequirements}
            onSuccess={() => setSubmitted(true)}
          />
        )}
      </div>
    </div>
  )
}
