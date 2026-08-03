'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { 
  ArrowLeft, Camera, Building2, User, Mail, Phone, 
  MessageCircle, Globe, MapPin, Save, Loader2, Upload, ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

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
  const [activeTab, setActiveTab] = useState<'profile' | 'organization'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [organization, setOrganization] = useState<OrgData>({
    name: '', logo: null, email: null, phone: null, wechat: null,
    address: null, website: null, description: null, welcomeMessage: null,
  })

  useEffect(() => {
    fetchProfile()
  }, [])

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
      toast.error('Failed to load profile')
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
        toast.success('Profile saved')
        update()
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Failed to save')
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
        toast.success('Organization saved — logo will update in sidebar')
        // Force page refresh to update sidebar logo
        window.location.reload()
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setOrganization(prev => ({ ...prev, logo: ev.target?.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const inputClass = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white transition-all"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5"

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Profile</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your personal and organization details</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4 inline mr-1.5" />
          My Profile
        </button>
        <button
          onClick={() => setActiveTab('organization')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'organization' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-1.5" />
          Organization
        </button>
      </div>

      {activeTab === 'profile' && profile && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
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
                className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md border border-slate-200 hover:bg-slate-50 transition"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{profile.name}</h3>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                profile.role === 'OWNER' ? 'bg-amber-100 text-amber-700' :
                profile.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {profile.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input value={profile.email} disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} className={`${inputClass} pl-9`} placeholder="+1 234 567 8900" />
              </div>
            </div>
            <div>
              <label className={labelClass}>WeChat</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input value={profile.wechat || ''} onChange={e => setProfile({...profile, wechat: e.target.value})} className={`${inputClass} pl-9`} placeholder="WeChat ID" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Bio / About</label>
              <textarea 
                value={profile.bio || ''} 
                onChange={e => setProfile({...profile, bio: e.target.value})} 
                rows={3} 
                className={inputClass} 
                placeholder="A short description about yourself..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={saveProfile} 
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Save Profile
            </button>
          </div>
        </div>
      )}

      {activeTab === 'organization' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {organization.logo ? (
                <img src={organization.logo} alt="Logo" className="w-24 h-24 object-contain rounded-xl border border-slate-200 bg-white" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                  <ImageIcon className="w-10 h-10 text-slate-400" />
                </div>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-1.5 shadow-md border border-slate-200 hover:bg-slate-50 transition"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Company Logo</h3>
              <p className="text-sm text-slate-500 mt-0.5">This logo will appear in the sidebar. Max 2MB.</p>
              {organization.logo && (
                <button 
                  onClick={() => setOrganization(prev => ({...prev, logo: null}))}
                  className="text-xs text-rose-500 hover:text-rose-700 mt-2 font-medium"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Organization Name</label>
              <input 
                value={organization.name} 
                onChange={e => setOrganization({...organization, name: e.target.value})} 
                className={inputClass} 
                placeholder="Your company name"
              />
            </div>
            <div>
              <label className={labelClass}>Organization Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  value={organization.email || ''} 
                  onChange={e => setOrganization({...organization, email: e.target.value})} 
                  className={`${inputClass} pl-9`} 
                  placeholder="contact@company.com"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  value={organization.phone || ''} 
                  onChange={e => setOrganization({...organization, phone: e.target.value})} 
                  className={`${inputClass} pl-9`} 
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>WeChat</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  value={organization.wechat || ''} 
                  onChange={e => setOrganization({...organization, wechat: e.target.value})} 
                  className={`${inputClass} pl-9`} 
                  placeholder="Company WeChat"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  value={organization.website || ''} 
                  onChange={e => setOrganization({...organization, website: e.target.value})} 
                  className={`${inputClass} pl-9`} 
                  placeholder="https://company.com"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  value={organization.address || ''} 
                  onChange={e => setOrganization({...organization, address: e.target.value})} 
                  className={`${inputClass} pl-9`} 
                  placeholder="Business address"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea 
                value={organization.description || ''} 
                onChange={e => setOrganization({...organization, description: e.target.value})} 
                rows={3} 
                className={inputClass} 
                placeholder="About your organization..."
              />
            </div>
            {profile?.role === 'OWNER' && (
              <div className="md:col-span-2">
                <label className={labelClass}>Welcome Message for New Users</label>
                <p className="text-xs text-slate-400 mb-1.5">This message will be automatically sent to every new agent or admin when their account is created.</p>
                <textarea 
                  value={organization.welcomeMessage || ''} 
                  onChange={e => setOrganization({...organization, welcomeMessage: e.target.value})} 
                  rows={3} 
                  className={inputClass} 
                  placeholder="Welcome to GLORIE! We're excited to have you on board..."
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button 
              onClick={saveOrganization} 
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Save Organization
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
