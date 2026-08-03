'use client'

import Link from 'next/link'
import { UserCheck, Clock, CheckCircle, FileText, Eye, Plus } from 'lucide-react'

interface AgentDashboardProps {
  stats: {
    students: number
    pending: number
    approved: number
  }
  recentStudents: any[]
}

export default function AgentDashboard({ stats, recentStudents }: AgentDashboardProps) {
  const cards = [
    { label: 'My Students', value: stats.students, icon: UserCheck, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', href: '/dashboard/students' },
    { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', href: '/dashboard/students?status=PENDING' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', href: '/dashboard/students?status=APPROVED' },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your student applications</p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm shadow-sm shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((card) => (
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">My Recent Submissions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your latest student applications</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No students yet. Click "Add Student" to get started.
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
