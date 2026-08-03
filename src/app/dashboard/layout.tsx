'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { 
  LayoutDashboard, Users, UserPlus, FileText, 
  Settings, LogOut, Shield, GraduationCap, MessageSquare, 
  ListChecks
} from 'lucide-react'

interface OrgData {
  name: string
  logo: string | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'OWNER'
  const isOwner = role === 'OWNER'

  const [ownerOrg, setOwnerOrg] = useState<OrgData>({ name: 'GLORIE', logo: null })
  const [userOrg, setUserOrg] = useState<OrgData>({ name: 'GLORIE', logo: null })

  useEffect(() => {
    // Fetch owner's org for company branding
    fetch('/api/organization?owner=true', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data) {
          setOwnerOrg({ name: data.name || 'GLORIE', logo: data.logo || null })
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
    }
  }, [session?.user?.id])

  const baseNav = [
    { label: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { label: 'Settings', href: '/dashboard/profile', icon: Settings },
  ]

  const adminNav = isAdmin ? [
    { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'All Students', href: '/dashboard/students', icon: Users },
    { label: 'Add Student', href: '/dashboard/students/new', icon: UserPlus },
  ] : [
    { label: 'Dashboard', href: '/dashboard/agent', icon: LayoutDashboard },
    { label: 'My Students', href: '/dashboard/students', icon: Users },
    { label: 'Add Student', href: '/dashboard/students/new', icon: UserPlus },
  ]

  const ownerNav = isOwner ? [
    { label: 'Manage Accounts', href: '/dashboard/agents', icon: Shield },
    { label: 'Doc Requirements', href: '/dashboard/document-requirements', icon: FileText },
    { label: 'Field Requirements', href: '/dashboard/field-requirements', icon: ListChecks },
  ] : []

  const navItems = [...adminNav, ...ownerNav, ...baseNav]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 fixed h-full z-10 flex flex-col shadow-sm">
        {/* Company Logo - Owner's branding */}
        <div className="p-5 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            {ownerOrg.logo ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                <img src={ownerOrg.logo} alt="Logo" className="w-full h-full object-contain p-0.5" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow shrink-0">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-lg tracking-tight truncate">{ownerOrg.name}</h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wider uppercase">Student Portal</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-0.5 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section - avatar + name */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 px-3">
            {userOrg.logo ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                <img src={userOrg.logo} alt="Avatar" className="w-full h-full object-contain p-0.5" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{session?.user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
            </div>
          </div>
          <div className="px-3 mb-3">
            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
              role === 'OWNER' ? 'bg-amber-100 text-amber-700' :
              isAdmin ? 'bg-violet-100 text-violet-700' : 
              'bg-emerald-100 text-emerald-700'
            }`}>
              {role === 'OWNER' ? 'Owner' : isAdmin ? 'Admin' : 'Agent'}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}
