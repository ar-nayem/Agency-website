'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft, Camera, Building2, User, Mail, Phone,
  MessageCircle, Globe, MapPin, Save, Loader2, Upload, ImageIcon, Lock, X, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

const TIMEZONES: string[] = (() => {
  try {
    return (Intl as any).supportedValuesOf('timeZone')
  } catch {
    return [
      'UTC', 'Asia/Shanghai', 'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
      'Asia/Tokyo', 'Asia/Hong_Kong', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
      'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney',
    ]
  }
})()

interface ProfileData {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  wechat: string | null
  avatar: string | null
  bio: string | null
}

interface OrgData {
  id?: string
  name: string
  logo: string | null
  email: string | null
  phone: string | null
  wechat: string | null
  address: string | null
  website: string | null
  description: string | null
  welcomeMessage: string | null
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const { t, timezone, setTimezone } = useLanguage()
  const [activeTab, setActiveTab] = useState<'profile' | 'organization'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [organization, setOrganization] = useState<OrgData>({
    name: '', logo: null, email: null, phone: null, wechat: null,
    address: null, website: null, description: null, welcomeMessage: null,
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const isOwner = profile?.role === 'OWNER'

  const [newEmail, setNewEmail] = useState('')
  const [emailChangePassword, setEmailChangePassword] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailStep, setEmailStep] = useState<'idle' | 'code-sent'>('idle')
  const [pendingEmailShown, setPendingEmailShown] = useState('')
  const [requestingEmailChange, setRequestingEmailChange] = useState(false)
  const [confirmingEmailChange, setConfirmingEmailChange] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'organization' && profile && !isOwner) {
      setActiveTab('profile')
    }
  }, [activeTab, profile, isOwner])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        if (data.organization) {
          setOrganization(data.organization)
        }
      }
    } catch {
      toast.error(t('settings.failedToLoadProfile'))
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          wechat: profile.wechat,
          avatar: profile.avatar,
          bio: profile.bio,
        })
      })
      if (res.ok) {
        toast.success(t('settings.profileSavedToast'))
        update()
      } else {
        toast.error(t('settings.failedToSave'))
      }
    } catch {
      toast.error(t('settings.failedToSave'))
    } finally {
      setSaving(false)
    }
  }

  async function saveOrganization() {
    setSaving(true)
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(organization)
      })
      if (res.ok) {
        const data = await res.json()
        setOrganization(data)
        toast.success(t('settings.organizationSavedToast'))
        // Force page refresh to update sidebar logo
        window.location.reload()
      } else {
        toast.error(t('settings.failedToSave'))
      }
    } catch {
      toast.error(t('settings.failedToSave'))
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      toast.error(t('settings.fillAllPasswordFields'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordsDontMatch'))
      return
    }
    if (newPassword.length < 6) {
      toast.error(t('settings.passwordTooShort'))
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      })
      if (res.ok) {
        toast.success(t('settings.passwordChangedToast'))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || t('settings.failedToSave'))
      }
    } catch {
      toast.error(t('settings.failedToSave'))
    } finally {
      setChangingPassword(false)
    }
  }

  async function requestEmailChange() {
    if (!newEmail || !emailChangePassword) {
      toast.error(t('settings.fillEmailAndPassword'))
      return
    }
    setRequestingEmailChange(true)
    try {
      const res = await fetch('/api/profile/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newEmail, currentPassword: emailChangePassword })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('settings.emailCodeSentToast'))
        setPendingEmailShown(newEmail)
        setEmailStep('code-sent')
      } else {
        toast.error(data.error || t('settings.failedToSave'))
      }
    } catch {
      toast.error(t('settings.failedToSave'))
    } finally {
      setRequestingEmailChange(false)
    }
  }

  async function confirmEmailChange() {
    if (!emailCode) return
    setConfirmingEmailChange(true)
    try {
      const res = await fetch('/api/profile/email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: emailCode })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(t('settings.emailChangedToast'))
        if (profile) setProfile({ ...profile, email: data.email })
        setEmailStep('idle')
        setNewEmail('')
        setEmailChangePassword('')
        setEmailCode('')
        setPendingEmailShown('')
      } else {
        toast.error(data.error || t('settings.failedToSave'))
      }
    } catch {
      toast.error(t('settings.failedToSave'))
    } finally {
      setConfirmingEmailChange(false)
    }
  }

  function cancelEmailChange() {
    setEmailStep('idle')
    setNewEmail('')
    setEmailChangePassword('')
    setEmailCode('')
    setPendingEmailShown('')
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('settings.logoTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setOrganization(prev => ({ ...prev, logo: ev.target?.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const inputClass = "w-full px-3.5 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-card transition-all"
  const labelClass = "block text-sm font-medium text-foreground mb-1.5"

  const roleLabel = profile?.role === 'OWNER' ? t('common.roleOwner') : profile?.role === 'ADMIN' ? t('common.roleAdmin') : t('common.roleAgent')

  if (loading) return <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('settings.profileTitle')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('settings.profileSubtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4 h-4 inline mr-1.5" />
          {t('settings.myProfileTab')}
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('organization')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'organization' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-1.5" />
            {t('settings.organizationTab')}
          </button>
        )}
      </div>

      {activeTab === 'profile' && profile && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.avatar ? (
                <img src={profile.avatar} alt={t('settings.avatarAlt')} className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => setProfile({...profile, avatar: ev.target?.result as string})
                    reader.readAsDataURL(file)
                  }
                  input.click()
                }}
                className="absolute -bottom-1 -right-1 bg-card rounded-full p-1.5 shadow-md border border-border hover:bg-muted transition"
              >
                <Camera className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div>
              <h3 className="font-bold text-foreground">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                profile.role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
                profile.role === 'ADMIN' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              }`}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('settings.fullNameLabel')}</label>
              <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('settings.emailLabel')}</label>
              <input value={profile.email} disabled className={`${inputClass} bg-muted text-muted-foreground`} />
            </div>
            <div>
              <label className={labelClass}>{t('settings.phoneLabel')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} className={`${inputClass} pl-9`} placeholder={t('settings.phonePlaceholderExample')} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('settings.wechatLabel')}</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input value={profile.wechat || ''} onChange={e => setProfile({...profile, wechat: e.target.value})} className={`${inputClass} pl-9`} placeholder={t('settings.wechatIdPlaceholder')} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t('settings.bioLabel')}</label>
              <textarea
                value={profile.bio || ''}
                onChange={e => setProfile({...profile, bio: e.target.value})}
                rows={3}
                className={inputClass}
                placeholder={t('settings.bioPlaceholder')}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t('settings.timezoneLabel')}</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  list="timezone-options"
                  value={timezone}
                  onChange={e => {
                    if (TIMEZONES.includes(e.target.value)) {
                      setTimezone(e.target.value)
                      toast.success(t('settings.timezoneSaved'))
                    }
                  }}
                  className={`${inputClass} pl-9`}
                />
                <datalist id="timezone-options">
                  {TIMEZONES.map(tz => <option key={tz} value={tz} />)}
                </datalist>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{t('settings.timezoneHint')}</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {t('settings.saveProfileBtn')}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'profile' && profile && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 space-y-6 mt-6">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-foreground">{t('settings.changePasswordTitle')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>{t('settings.currentPasswordLabel')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className={labelClass}>{t('settings.newPasswordLabel')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={labelClass}>{t('settings.confirmPasswordLabel')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={changePassword}
              disabled={changingPassword}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
            >
              {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              <Lock className="w-4 h-4" />
              {t('settings.changePasswordBtn')}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'profile' && profile && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 space-y-6 mt-6">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-foreground">{t('settings.changeEmailTitle')}</h3>
          </div>
          <p className="text-sm text-muted-foreground -mt-4">{t('settings.changeEmailDesc')}</p>

          {emailStep === 'idle' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('settings.newEmailLabel')}</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className={inputClass}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('settings.currentPasswordForEmailLabel')}</label>
                  <input
                    type="password"
                    value={emailChangePassword}
                    onChange={e => setEmailChangePassword(e.target.value)}
                    className={inputClass}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  onClick={requestEmailChange}
                  disabled={requestingEmailChange}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
                >
                  {requestingEmailChange && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Mail className="w-4 h-4" />
                  {t('settings.sendCodeBtn')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground">
                {t('settings.verificationCodeSentTo').replace('{email}', pendingEmailShown)}
              </p>
              <div className="max-w-xs">
                <label className={labelClass}>{t('settings.verificationCodeLabel')}</label>
                <input
                  value={emailCode}
                  onChange={e => setEmailCode(e.target.value)}
                  className={inputClass}
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  onClick={cancelEmailChange}
                  className="px-4 py-2.5 border border-border rounded-xl hover:bg-muted transition flex items-center gap-2 font-medium text-sm"
                >
                  <X className="w-4 h-4" />
                  {t('settings.cancelBtn')}
                </button>
                <button
                  onClick={confirmEmailChange}
                  disabled={confirmingEmailChange || !emailCode}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
                >
                  {confirmingEmailChange && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('settings.confirmEmailBtn')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'organization' && isOwner && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {organization.logo ? (
                <img src={organization.logo} alt={t('settings.logoAlt')} className="w-24 h-24 object-contain rounded-xl border border-border bg-card" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border border-border">
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 bg-card rounded-full p-1.5 shadow-md border border-border hover:bg-muted transition"
              >
                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
            </div>
            <div>
              <h3 className="font-bold text-foreground">{t('settings.companyLogoTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{t('settings.companyLogoDesc')}</p>
              {organization.logo && (
                <button
                  onClick={() => setOrganization(prev => ({...prev, logo: null}))}
                  className="text-xs text-rose-500 hover:text-rose-700 mt-2 font-medium"
                >
                  {t('settings.removeLogo')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('settings.organizationNameLabel')}</label>
              <input
                value={organization.name}
                onChange={e => setOrganization({...organization, name: e.target.value})}
                className={inputClass}
                placeholder={t('settings.organizationNamePlaceholder')}
              />
            </div>
            <div>
              <label className={labelClass}>{t('settings.organizationEmailLabel')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  value={organization.email || ''}
                  onChange={e => setOrganization({...organization, email: e.target.value})}
                  className={`${inputClass} pl-9`}
                  placeholder={t('settings.organizationEmailPlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('settings.phoneLabel')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  value={organization.phone || ''}
                  onChange={e => setOrganization({...organization, phone: e.target.value})}
                  className={`${inputClass} pl-9`}
                  placeholder={t('settings.phonePlaceholderExample')}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('settings.wechatLabel')}</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  value={organization.wechat || ''}
                  onChange={e => setOrganization({...organization, wechat: e.target.value})}
                  className={`${inputClass} pl-9`}
                  placeholder={t('settings.companyWechatPlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('settings.websiteLabel')}</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  value={organization.website || ''}
                  onChange={e => setOrganization({...organization, website: e.target.value})}
                  className={`${inputClass} pl-9`}
                  placeholder={t('settings.websitePlaceholder')}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('settings.addressLabel')}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  value={organization.address || ''}
                  onChange={e => setOrganization({...organization, address: e.target.value})}
                  className={`${inputClass} pl-9`}
                  placeholder={t('settings.addressPlaceholder')}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t('settings.descriptionLabel')}</label>
              <textarea
                value={organization.description || ''}
                onChange={e => setOrganization({...organization, description: e.target.value})}
                rows={3}
                className={inputClass}
                placeholder={t('settings.organizationDescPlaceholder')}
              />
            </div>
            {profile?.role === 'OWNER' && (
              <div className="md:col-span-2">
                <label className={labelClass}>{t('settings.welcomeMessageLabel')}</label>
                <p className="text-xs text-muted-foreground mb-1.5">{t('settings.welcomeMessageDesc')}</p>
                <textarea
                  value={organization.welcomeMessage || ''}
                  onChange={e => setOrganization({...organization, welcomeMessage: e.target.value})}
                  rows={3}
                  className={inputClass}
                  placeholder={t('settings.welcomeMessagePlaceholder')}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={saveOrganization}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {t('settings.saveOrganizationBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}