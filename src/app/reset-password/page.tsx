'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { GraduationCap, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/src/components/LanguageToggle'

function ResetPasswordForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error(t('login.passwordsDontMatch'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('login.somethingWrong'))
        return
      }
      setDone(true)
      toast.success(t('login.passwordResetSuccess'))
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      toast.error(t('login.somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  if (!email || !token) {
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-slate-300">{t('login.invalidResetLink')}</p>
        <Link href="/forgot-password" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300">
          <ArrowLeft className="w-4 h-4" /> {t('login.backToSignIn')}
        </Link>
      </div>
    )
  }

  if (done) {
    return <p className="text-center text-sm text-slate-300">{t('login.passwordResetSuccess')}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('login.newPassword')}</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('login.confirmPassword')}</label>
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-500 hover:to-violet-500 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('login.resetPassword')}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  const { t } = useLanguage()
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
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('login.resetPassword')}</h1>
          </div>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
