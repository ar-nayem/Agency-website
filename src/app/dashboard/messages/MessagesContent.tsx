'use client'


import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  MessageSquare, Send, ArrowLeft, Loader2, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

const MENTION_REGEX = /@([A-Za-z]{1,6}-\d{3,})/g

interface MentionStudent {
  id: string
  fullName: string
  serialNumber: string | null
  status: string
}

// Shared across all message bubbles so the same serial isn't re-fetched per render.
const mentionCache = new Map<string, MentionStudent | null>()

async function resolveMention(serial: string): Promise<MentionStudent | null> {
  if (mentionCache.has(serial)) return mentionCache.get(serial) ?? null
  try {
    const res = await fetch(`/api/students/by-serial/${encodeURIComponent(serial)}`, { credentials: 'include' })
    const result = res.ok ? await res.json() : null
    mentionCache.set(serial, result)
    return result
  } catch {
    mentionCache.set(serial, null)
    return null
  }
}

function MentionChip({ serial }: { serial: string }) {
  const { t } = useLanguage()
  const [student, setStudent] = useState<MentionStudent | null | undefined>(mentionCache.get(serial))

  useEffect(() => {
    let cancelled = false
    if (!mentionCache.has(serial)) {
      resolveMention(serial).then(result => { if (!cancelled) setStudent(result) })
    }
    return () => { cancelled = true }
  }, [serial])

  if (student === undefined) {
    return <span className="opacity-70">@{serial}</span>
  }
  if (!student) {
    return <span className="opacity-70" title={t('messages.noAccessFile')}>@{serial}</span>
  }
  return (
    <Link
      href={`/dashboard/students/${student.id}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/10 hover:bg-black/20 font-medium underline decoration-dotted"
      title={student.fullName}
    >
      <FileText className="w-3 h-3" />@{serial}
    </Link>
  )
}

function renderMessageContent(content: string) {
  const parts = content.split(MENTION_REGEX)
  // String.split with a capturing group interleaves matched groups into the result.
  return parts.map((part, i) =>
    i % 2 === 1 ? <MentionChip key={i} serial={part} /> : <span key={i}>{part}</span>
  )
}

interface Conversation {
  partner: { id: string; name: string; role: string }
  student: { id: string; fullName: string; serialNumber: string | null } | null
  lastMessage: any
  unreadCount: number
}

interface MessageItem {
  id: string
  content: string
  senderId: string
  receiverId: string
  isRead: boolean
  createdAt: string
  student: { id: string; fullName: string; serialNumber: string | null } | null
  sender: { id: string; name: string; role: string }
}

export default function MessagesContent() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const initialWith = searchParams.get('with')
  const initialStudent = searchParams.get('studentId')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [selectedPartner, setSelectedPartner] = useState<string | null>(initialWith)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(initialStudent)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [agents, setAgents] = useState<any[]>([])
  const [showNewChat, setShowNewChat] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newChatPartnerName, setNewChatPartnerName] = useState<string | null>(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionResults, setMentionResults] = useState<MentionStudent[]>([])
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER'

  useEffect(() => {
    fetchConversations()
    fetchAgents()
  }, [])

  useEffect(() => {
    if (selectedPartner) {
      setMessages([])
      setMessagesLoading(true)
      fetchMessages(selectedPartner, selectedStudent)
      const interval = setInterval(() => fetchMessages(selectedPartner, selectedStudent), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedPartner, selectedStudent])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const unread = messages.filter(m => !m.isRead && m.senderId !== session?.user?.id)
    unread.forEach(m => markAsRead(m.id))
    if (unread.length > 0) {
      setMessages(prev => prev.map(m => unread.some(u => u.id === m.id) ? { ...m, isRead: true } : m))
    }
  }, [messages, session?.user?.id])

  async function fetchConversations() {
    try {
      const res = await fetch('/api/messages', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch {
      toast.error(t('messages.failedLoadConversations'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages(partnerId: string, studentId: string | null) {
    try {
      const url = `/api/messages?with=${partnerId}${studentId ? `&studentId=${studentId}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch {
      console.error('Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  async function fetchAgents() {
    try {
      const res = await fetch('/api/agents', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAgents(data)
      }
    } catch {
      console.error(t('messages.failedLoadAgents'))
    }
  }

  async function sendMessage() {
    const content = newMessage.trim()
    if (!content || !selectedPartner || sending) return
    setSending(true)
    setNewMessage('')
    setMentionOpen(false)
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMessage: MessageItem = {
      id: optimisticId,
      content,
      senderId: session?.user?.id || '',
      receiverId: selectedPartner,
      isRead: true,
      createdAt: new Date().toISOString(),
      student: null,
      sender: { id: session?.user?.id || '', name: session?.user?.name || '', role: session?.user?.role || '' },
    }
    setMessages(prev => [...prev, optimisticMessage])
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: selectedPartner,
          content,
          studentId: selectedStudent,
        })
      })
      if (res.ok) {
        setNewChatPartnerName(null)
        await fetchMessages(selectedPartner, selectedStudent)
        await fetchConversations()
      } else {
        const data = await res.json()
        toast.error(data.error || t('messages.failedSendMessage'))
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        setNewMessage(content)
      }
    } catch {
      toast.error(t('messages.failedSendMessage'))
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setNewMessage(content)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    const cursor = e.target.selectionStart
    setNewMessage(value)

    const beforeCursor = value.slice(0, cursor)
    const match = beforeCursor.match(/@([A-Za-z0-9-]*)$/)
    if (match) {
      const query = match[1]
      setMentionStart(cursor - match[0].length)
      setMentionOpen(true)
      fetch(`/api/students/mentions?q=${encodeURIComponent(query)}`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : [])
        .then(setMentionResults)
        .catch(() => setMentionResults([]))
    } else {
      setMentionOpen(false)
    }
  }

  function insertMention(student: MentionStudent) {
    if (mentionStart === null || !student.serialNumber) return
    const cursor = textareaRef.current?.selectionStart ?? newMessage.length
    const value = `${newMessage.slice(0, mentionStart)}@${student.serialNumber} ${newMessage.slice(cursor)}`
    setNewMessage(value)
    setMentionOpen(false)
    setMentionResults([])
    const nextCursor = mentionStart + student.serialNumber.length + 2
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
    })
  }

  async function markAsRead(messageId: string) {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        credentials: 'include',
      })
    } catch {
      // silent
    }
  }

  function getConversationLabel(conv: Conversation) {
    const studentPart = conv.student ? ` (${conv.student.fullName})` : ''
    const serialPart = conv.student?.serialNumber ? ` [${conv.student.serialNumber}]` : ''
    return `${conv.partner.name}${studentPart}${serialPart}`
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const activeConversation = conversations.find(c => 
    c.partner.id === selectedPartner && 
    (selectedStudent ? c.student?.id === selectedStudent : !c.student)
  )

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
      <div className="hidden sm:flex items-center gap-4 mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('messages.title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('messages.subtitle')}</p>
        </div>
      </div>

      <div className="bg-card sm:rounded-2xl shadow-sm border border-border/60 overflow-hidden flex h-full sm:h-[calc(100%-4rem)]">
        {/* Sidebar - Conversations */}
        <div className={`w-full md:w-80 border-r border-border flex-col ${selectedPartner ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground text-sm">{t('messages.conversations')}</h2>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                {t('messages.newChat')}
              </button>
            </div>
            {showNewChat && (
              <div className="mb-2 p-3 bg-muted rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                  {isAdmin ? t('messages.selectPerson') : t('messages.selectAdmin')}
                </p>
                <select
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-card focus:ring-2 focus:ring-indigo-500 outline-none"
                  onChange={(e) => {
                    if (e.target.value) {
                      const agent = agents.find(a => a.id === e.target.value)
                      setSelectedPartner(e.target.value)
                      setSelectedStudent(null)
                      setNewChatPartnerName(agent?.name || null)
                      setShowNewChat(false)
                    }
                  }}
                  value=""
                >
                  <option value="">{t('messages.chooseRecipient')}</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">{t('common.loading')}</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('messages.noConversationsYet')}</p>
                <p className="text-xs mt-1 text-muted-foreground">{t('messages.clickNewToStart')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <button
                    key={`${conv.partner.id}-${conv.student?.id || 'general'}`}
                    onClick={() => {
                      setSelectedPartner(conv.partner.id)
                      setSelectedStudent(conv.student?.id || null)
                      setNewChatPartnerName(null)
                    }}
                    className={`w-full text-left p-4 hover:bg-muted transition flex items-start gap-3 ${
                      selectedPartner === conv.partner.id && selectedStudent === (conv.student?.id || null)
                        ? 'bg-indigo-50/60 hover:bg-indigo-50/60'
                        : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm">
                      {conv.partner.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {getConversationLabel(conv)}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conv.lastMessage?.content || t('messages.noMessages')}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {conv.lastMessage?.createdAt ? formatTime(conv.lastMessage.createdAt) : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex-col min-w-0 ${selectedPartner ? 'flex' : 'hidden md:flex'}`}>
          {selectedPartner && (activeConversation || newChatPartnerName) ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <button
                  onClick={() => { setSelectedPartner(null); setSelectedStudent(null); setNewChatPartnerName(null) }}
                  className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0">
                  {(activeConversation?.partner.name || newChatPartnerName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {activeConversation?.partner.name || newChatPartnerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation ? (
                      <>
                        {activeConversation.partner.role}
                        {activeConversation.student && (
                          <span> · {activeConversation.student.fullName} <span className="font-mono text-indigo-600 font-semibold">[{activeConversation.student.serialNumber || t('messages.noSerialShort')}]</span></span>
                        )}
                      </>
                    ) : t('messages.newConversation')}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">{t('common.loading')}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('messages.noMessagesYet')}</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = msg.senderId === session?.user?.id
                    const prev = messages[i - 1]
                    const showGap = prev && (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) > 5 * 60 * 1000
                    return (
                      <div key={msg.id} className={showGap ? 'pt-2' : ''}>
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                              isMine
                                ? 'bg-indigo-600 text-white rounded-br-md'
                                : 'bg-muted text-foreground rounded-bl-md'
                            } ${msg.id.startsWith('optimistic-') ? 'opacity-60' : ''}`}>
                              {renderMessageContent(msg.content)}
                            </div>
                            <p className={`text-[11px] text-muted-foreground mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border relative">
                {mentionOpen && mentionResults.length > 0 && (
                  <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto z-10">
                    <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t('messages.mentionFile')}
                    </p>
                    {mentionResults.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); insertMention(s) }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-indigo-600">{s.serialNumber || t('messages.noSerial')}</span>
                        <span className="text-sm text-foreground truncate">{s.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleMessageChange}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setMentionOpen(false)
                      if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder={t('messages.typeMessage')}
                    rows={1}
                    className="flex-1 px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-muted/50 resize-none max-h-32"
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-muted-foreground">{t('messages.selectConversation')}</p>
                <p className="text-sm mt-1 text-muted-foreground">{t('messages.chooseFromSidebar')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}