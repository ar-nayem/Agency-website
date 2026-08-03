'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, UserCheck,
  TrendingUp, FileText, Eye
} from 'lucide-react'

interface AdminDashboardProps {
  stats: {
    agents: number
    students: number
    pending: number
    approved: number
    rejected: number
  }
  recentStudents: any[]
}

interface DonutSlice {
  key: string
  label: string
  value: number
  color: string
  href: string
}

function StatusDonut({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)

  const size = 200
  const r = 78
  const stroke = 30
  const circumference = 2 * Math.PI * r
  let cumulative = 0

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">
        No students yet
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {slices.filter(s => s.value > 0).map((s) => {
          const fraction = s.value / total
          const dash = fraction * circumference
          const offset = -cumulative
          cumulative += dash
          const isHovered = hovered === s.key
          return (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={isHovered ? stroke + 6 : stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => router.push(s.href)}
            >
              <title>{s.label}: {s.value}</title>
            </circle>
          )
        })}
      </svg>
      <div className="-mt-[124px] text-center pointer-events-none">
        <p className="text-3xl font-bold text-slate-900">
          {hovered ? slices.find(s => s.key === hovered)?.value : total}
        </p>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
          {hovered ? slices.find(s => s.key === hovered)?.label : 'Total'}
        </p>
      </div>
    </div>
  )
}

export default function AdminDashboard({ stats, recentStudents }: AdminDashboardProps) {
  const topCards = [
    { label: 'Total Agents', value: stats.agents, icon: Users, color: 'from-indigo-500 to-indigo-600', href: '/dashboard/agents' },
    { label: 'Total Students', value: stats.students, icon: UserCheck, color: 'from-violet-500 to-violet-600', href: '/dashboard/students' },
  ]

  const slices: DonutSlice[] = [
    { key: 'PENDING', label: 'Pending Review', value: stats.pending, color: '#f59e0b', href: '/dashboard/students?status=PENDING' },
    { key: 'APPROVED', label: 'Approved', value: stats.approved, color: '#10b981', href: '/dashboard/students?status=APPROVED' },
    { key: 'REJECTED', label: 'Rejected', value: stats.rejected, color: '#f43f5e', href: '/dashboard/students?status=REJECTED' },
  ]

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-700 border-rose-200'
    }
    return styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">Overview of your student portal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="flex flex-col gap-5">
          {topCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1.5">{card.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 flex flex-col sm:flex-row items-center gap-6">
          <StatusDonut slices={slices} total={stats.pending + stats.approved + stats.rejected} />
          <div className="flex-1 w-full space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Application Status</p>
            {slices.map((s) => (
              <Link
                key={s.key}
                href={s.href}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{s.label}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{s.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Submissions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest student applications</p>
          </div>
          <Link href="/dashboard/students" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            View All <TrendingUp className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No recent submissions
                  </td>
                </tr>
              ) : (
                recentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{student.fullName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{student.mainEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{student.agent.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(student.status)}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {student.documents.length}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(student.createdAt).toLocaleDateString()}
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
