'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Users, UserPlus, FileText,
  Settings, LogOut, Shield, GraduationCap, MessageSquare,
  ListChecks, Menu, X, Wallet, Globe
} from 'lucide-react'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/src/components/LanguageToggle'
import { ThemeToggle } from '@/src/components/ThemeToggle'

interface OrgData {
  name: string
  logo: string | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { t } = useLanguage()
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'OWNER'
  const isOwner = role === 'OWNER'

  const [ownerOrg, setOwnerOrg] = useState<OrgData>({ name: 'Chengdu Dream Fly Edu', logo: null })
  const [userOrg, setUserOrg] = useState<OrgData>({ name: 'Chengdu Dream Fly Edu', logo: null })
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<{ name: string; email: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    // Fetch owner's org for company branding
    fetch('/api/organization?owner=true', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data) {
          setOwnerOrg({ name: data.name || 'Chengdu Dream Fly Edu', logo: data.logo || null })
        }
      })
      .catch(() => {})

    // Fetch current user's org for their own avatar/logo
    if (session?.user?.id) {
      fetch(`/api/organization?userId=${session.user.id}`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          if (data) {
            setUserOrg({ name: data.name || session?.user?.name || 'User', logo: data.logo || null })
          }
        })
        .catch(() => {})

      // Personal profile picture + live name/email (session JWT can go stale if these change after login)
      fetch('/api/profile', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          setMyAvatar(data?.profile?.avatar || null)
          if (data?.profile) {
            setMyProfile({ name: data.profile.name, email: data.profile.email })
          }
        })
        .catch(() => {})
    }
  }, [session?.user?.id])

  const baseNav = [
    { label: t('nav.messages'), href: '/dashboard/messages', icon: MessageSquare },
    { label: t('nav.settings'), href: '/dashboard/profile', icon: Settings },
  ]

  const adminNav = isAdmin ? [
    { label: t('nav.dashboard'), href: '/dashboard/admin', icon: LayoutDashboard },
    { label: t('nav.allStudents'), href: '/dashboard/students', icon: Users },
    { label: t('nav.addStudent'), href: '/dashboard/students/new', icon: UserPlus },
    { label: t('nav.finance'), href: '/dashboard/finance', icon: Wallet },
  ] : [
    { label: t('nav.dashboard'), href: '/dashboard/agent', icon: LayoutDashboard },
    { label: t('nav.myStudents'), href: '/dashboard/students', icon: Users },
    { label: t('nav.addStudent'), href: '/dashboard/students/new', icon: UserPlus },
    { label: t('nav.finance'), href: '/dashboard/finance', icon: Wallet },
  ]

  const ownerNav = isOwner ? [
    { label: t('nav.manageAccounts'), href: '/dashboard/agents', icon: Shield },
    { label: t('nav.docRequirements'), href: '/dashboard/document-requirements', icon: FileText },
    { label: t('nav.fieldRequirements'), href: '/dashboard/field-requirements', icon: ListChecks },
    { label: t('nav.portals'), href: '/dashboard/portals', icon: Globe },
  ] : []

  const navItems = [...adminNav, ...ownerNav, ...baseNav]

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-foreground text-sm truncate">{ownerOrg.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      <div className="flex">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`w-64 bg-card border-r border-border fixed inset-y-0 left-0 z-40 flex flex-col shadow-sm transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Company Logo - Owner's branding */}
          <div className="p-5 border-b border-border shrink-0">
            <div className="flex items-center justify-between gap-2">
              <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
                {ownerOrg.logo ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center shrink-0">
                    <img src={ownerOrg.logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="font-bold text-foreground text-lg tracking-tight truncate">{ownerOrg.name}</h1>
                  <p className="text-[11px] text-muted-foreground font-medium tracking-wider uppercase">{t('nav.studentPortal')}</p>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <LanguageToggle className="flex-1 justify-center" />
              <ThemeToggle />
            </div>
          </div>

          {/* Nav */}
          <nav className="px-3 py-4 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User section - avatar + name */}
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border shrink-0">
            <div className="flex items-center gap-3 mb-3 px-3">
              {(myAvatar || userOrg.logo) ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center shrink-0">
                  <img src={myAvatar || userOrg.logo || ''} alt="Avatar" className={`w-full h-full ${myAvatar ? 'object-cover' : 'object-contain p-0.5'}`} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {(myProfile?.name || session?.user?.name)?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{myProfile?.name || session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{myProfile?.email || session?.user?.email}</p>
              </div>
            </div>
            <div className="px-3 mb-3">
              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
                isAdmin ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              }`}>
                {role === 'OWNER' ? t('common.roleOwner') : isAdmin ? t('common.roleAdmin') : t('common.roleAgent')}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl transition-all duration-200"
            >
              <LogOut className="w-[18px] h-[18px]" />
              {t('nav.signOut')}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}