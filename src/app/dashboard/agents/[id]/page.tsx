'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft, Users, FileText, Clock, CheckCircle, XCircle,
  Activity, MessageSquare, Send, Loader2, Mail, Phone, MessageCircle as WeChat
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface AgentDetail {
  agent: {
    id: string; name: string; email: string; role: string; isActive: boolean
    phone: string | null; wechat: string | null; avatar: string | null; bio: string | null
    createdAt: string
  }
  students: {
    id: string; fullName: string; serialNumber: string | null; status: string
    mainEmail: string; createdAt: string; updatedAt: string
    _count: { documents: number }
  }[]
  stats: { total: number; pending: number; approved: number; rejected: number }
  documentCount: number
  activityLogs: { id: string; action: string; details: string | null; createdAt: string }[]
  messages: {
    id: string; content: string; senderId: string; createdAt: string; isRead: boolean
    sender: { id: string; name: string; role: string }
    student: { id: string; fullName: string; serialNumber: string | null } | null
  }[]
}

export default function AgentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { t, formatDate, formatDateTime } = useLanguage()

  const ACTION_LABELS: Record<string, string> = {
    LOGIN: t('agentsPage.activityLogin'),
    STUDENT_CREATED: t('agentsPage.activityStudentCreated'),
    STUDENT_UPDATED: t('agentsPage.activityStudentUpdated'),
    STUDENT_STATUS_CHANGED: t('agentsPage.activityStudentStatusChanged'),
    STUDENT_DELETED: t('agentsPage.activityStudentDeleted'),
    DOCUMENT_UPLOADED: t('agentsPage.activityDocumentUploaded'),
    DOCUMENT_DELETED: t('agentsPage.activityDocumentDeleted'),
    ACCOUNT_CREATED: t('agentsPage.activityAccountCreated'),
  }
  const [data, setData] = useState<AgentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN' && session.user?.role !== 'OWNER') {
      router.push('/dashboard')
      return
    }
    fetchAgent()
    const interval = setInterval(fetchAgent, 8000)
    return () => clearInterval(interval)
  }, [id, session])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/agents/${id}`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error(t('agentsPage.failedLoadAgent'))
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    const content = newMessage.trim()
    if (!content || !data) return
    setSending(true)
    setNewMessage('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ receiverId: data.agent.id, content }),
      })
      if (res.ok) {
        await fetchAgent()
      } else {
        toast.error(t('agentsPage.failedSendMessage'))
        setNewMessage(content)
      }
    } catch {
      toast.error(t('agentsPage.failedSendMessage'))
      setNewMessage(content)
    } finally {
      setSending(false)
    }
  }

  function formatTime(dateStr: string) {
    return formatDateTime(dateStr, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function timeAgo(dateStr: string) {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return t('agentsPage.justNow')
    if (mins < 60) return `${mins}${t('agentsPage.minutesAgo')}`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}${t('agentsPage.hoursAgo')}`
    const days = Math.floor(hours / 24)
    return `${days}${t('agentsPage.daysAgo')}`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200',
    }
    return styles[status] || 'bg-muted text-foreground border-border'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: t('common.statusPending'),
      APPROVED: t('common.statusApproved'),
      REJECTED: t('common.statusRejected'),
    }
    return labels[status] || status
  }

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t('common.loading')}</div>
  if (!data) return <div className="p-10 text-center text-muted-foreground">{t('agentsPage.agentNotFound')}</div>

  const { agent, students, stats, documentCount, activityLogs, messages } = data

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents" className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
          {agent.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{agent.name}</h1>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
              agent.role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' :
              agent.role === 'ADMIN' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
            }`}>{agent.role === 'OWNER' ? t('common.roleOwner') : agent.role === 'ADMIN' ? t('common.roleAdmin') : t('common.roleAgent')}</span>
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
              agent.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
            }`}>{agent.isActive ? t('common.active') : t('common.inactive')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{agent.email}</span>
            {agent.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{agent.phone}</span>}
            {agent.wechat && <span className="flex items-center gap-1"><WeChat className="w-3.5 h-3.5" />{agent.wechat}</span>}
            <span>{t('agentsPage.joined')} {formatDate(agent.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('dashboard.totalStudents'), value: stats.total, icon: Users, color: 'from-indigo-500 to-violet-600' },
          { label: t('common.statusPending'), value: stats.pending, icon: Clock, color: 'from-amber-400 to-amber-600' },
          { label: t('common.statusApproved'), value: stats.approved, icon: CheckCircle, color: 'from-emerald-400 to-emerald-600' },
          { label: t('common.statusRejected'), value: stats.rejected, icon: XCircle, color: 'from-rose-400 to-rose-600' },
          { label: t('dashboard.documents'), value: documentCount, icon: FileText, color: 'from-sky-400 to-sky-600' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl shadow-sm border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" /> {t('agentsPage.studentsCount')} ({students.length})
            </h2>
          </div>
          <div className="overflow-y-auto max-h-96 divide-y divide-border">
            {students.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t('agentsPage.noStudentsAssigned')}</p>
            ) : students.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/students/${s.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.mainEmail} {s.serialNumber && `· ${s.serialNumber}`}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{s._count.documents}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(s.status)}`}>
                    {getStatusLabel(s.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity timeline */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" /> {t('agentsPage.recentActivity')}
            </h2>
          </div>
          <div className="overflow-y-auto max-h-96 divide-y divide-border">
            {activityLogs.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t('agentsPage.noActivityYet')}</p>
            ) : activityLogs.map((log) => (
              <div key={log.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{ACTION_LABELS[log.action] || log.action}</p>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
                </div>
                {log.details && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat history */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden flex flex-col h-[28rem]">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" /> {t('agentsPage.chatHistory')}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('messages.noMessagesYet')}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === session?.user?.id
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[70%]">
                    <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isMine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                    <p className={`text-[11px] text-muted-foreground mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                      {msg.student && <span className="font-mono text-indigo-500">[{msg.student.fullName}] </span>}
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={`${t('agentsPage.messagePlaceholder')} ${agent.name}${t('agentsPage.messagePlaceholderSuffix')}`}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-muted/50"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm shadow-indigo-500/20"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}