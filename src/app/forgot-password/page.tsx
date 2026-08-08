'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, GraduationCap, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/src/components/LanguageToggle'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      await res.json().catch(() => null)
      setSent(true)
    } catch {
      toast.error(t('login.somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="max-w-md w-full relative z-10">
        <div className="flex justify-end mb-4">
          <LanguageToggle className="!bg-white/5 !border-white/10 !text-slate-300 hover:!bg-white/10" />
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mb-5 shadow-lg shadow-indigo-500/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('login.forgotPasswordTitle')}</h1>
            <p className="text-slate-400 mt-1 text-sm">{t('login.forgotPasswordSubtitle')}</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-300">{t('login.resetLinkSentMessage')}</p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300">
                <ArrowLeft className="w-4 h-4" /> {t('login.backToSignIn')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('login.email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                  placeholder={t('login.emailPlaceholder')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-500 hover:to-violet-500 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('login.sendResetLink')}
              </button>

              <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-300">
                <ArrowLeft className="w-4 h-4" /> {t('login.backToSignIn')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
