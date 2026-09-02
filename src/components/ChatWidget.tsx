'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useFeatures } from '@/src/lib/FeaturesContext'

type ChatMessage = { role: 'user' | 'bot'; text: string }

export function ChatWidget() {
  const { data: session } = useSession()
  const { has: hasFeature } = useFeatures()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      text: session?.user
        ? "Hi! Ask me about current offers, or a student's status (serial number, passport number, or name)."
        : 'Hi! Ask me about our current running or upcoming offers.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setMessages(m => [...m, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'bot', text: data.reply || 'Sorry, something went wrong.' }])
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, something went wrong. Try again.' }])
    } finally {
      setSending(false)
    }
  }

  // Logged-out visitors have no org context to gate against (same single-domain
  // limitation as the public offers endpoint), so the widget stays available to
  // them; a signed-in user whose package excludes the chatbot doesn't get it.
  if (session?.user && !hasFeature('chatbot')) return null

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-[28rem] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-indigo-600 text-white">
            <span className="font-semibold text-sm">Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="hover:opacity-80">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 bg-slate-100 dark:bg-slate-800">
                  <Loader2 size={16} className="animate-spin text-slate-500" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 border-t border-slate-200 dark:border-white/10">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about offers…"
              className="flex-1 rounded-lg border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="shrink-0 rounded-lg bg-indigo-600 text-white p-2 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle chat"
        className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-colors"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  )
}
