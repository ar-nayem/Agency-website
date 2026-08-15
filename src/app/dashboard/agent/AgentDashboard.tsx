'use client'

import Link from 'next/link'
import { UserCheck, Clock, CheckCircle, FileText, Eye, Plus } from 'lucide-react'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface AgentDashboardProps {
  stats: {
    students: number
    pending: number
    approved: number
  }
  recentStudents: any[]
}

export default function AgentDashboard({ stats, recentStudents }: AgentDashboardProps) {
  const { t, formatDate } = useLanguage()

  const cards = [
    { label: t('dashboard.myStudentsCard'), value: stats.students, icon: UserCheck, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', href: '/dashboard/students' },
    { label: t('dashboard.pendingReview'), value: stats.pending, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', href: '/dashboard/students?status=PENDING' },
    { label: t('dashboard.approved'), value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', href: '/dashboard/students?status=APPROVED' },
  ]

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200'
    }
    return styles[status as keyof typeof styles] || 'bg-muted text-foreground border-border'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: t('common.statusPending'),
      APPROVED: t('common.statusApproved'),
      REJECTED: t('common.statusRejected'),
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('dashboard.agentTitle')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('dashboard.manageApps')}</p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          {t('nav.addStudent')}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-card rounded-2xl shadow-sm border border-border/60 p-5 hover:shadow-md hover:border-border transition-all cursor-pointer block"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1.5">{card.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('dashboard.myRecentSubmissions')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.myLatestApplications')}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.student')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.documents')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.date')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">
                    {t('dashboard.noStudentsGetStarted')}
                  </td>
                </tr>
              ) : (
                recentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{student.fullName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{student.mainEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(student.status)}`}>
                        {getStatusLabel(student.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {student.documents.length}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(student.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/students/${student.id}`} className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex">
                        <Eye className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}