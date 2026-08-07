'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BarChart3, Users, Eye, CalendarDays, Monitor, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const router = useRouter()

  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const chartRef = useRef<HTMLDivElement>(null)

  // The chart shows the full selected range but most days start empty for a
  // freshly-deployed feature — default the scroll position to the most
  // recent (rightmost) days instead of leaving it at the empty start.
  useEffect(() => {
    if (chartRef.current) chartRef.current.scrollLeft = chartRef.current.scrollWidth
  }, [data])

  useEffect(() => {
    if (session && session.user?.role !== 'OWNER') {
      router.push('/dashboard')
      return
    }
    if (session?.user?.role === 'OWNER') fetchSummary()
  }, [session, days])

  async function fetchSummary() {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/summary?days=${days}`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error(t('analytics.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (session && session.user?.role !== 'OWNER') return null
  if (loading || !data) return <div className="p-10 text-center text-muted-foreground text-sm">{t('common.loading')}</div>

  const maxDaily = Math.max(...data.daily.map((d: any) => d.count), 1)
  const maxPage = Math.max(...data.topPages.map((p: any) => p.count), 1)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" /> {t('analytics.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('analytics.subtitle')}</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
        >
          <option value={7}>{t('analytics.last7Days')}</option>
          <option value={30}>{t('analytics.last30Days')}</option>
          <option value={90}>{t('analytics.last90Days')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('analytics.totalVisits')}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5">{data.totalVisits}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Eye className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('analytics.uniqueVisitors')}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5">{data.uniqueVisitors}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('analytics.visitsToday')}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5">{data.visitsToday}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('analytics.visitsThisWeek')}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5">{data.visitsThisWeek}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily visits bar chart */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">{t('analytics.visitsOverTime')}</h3>
        <div ref={chartRef} className="flex items-end gap-1 h-40 overflow-x-auto">
          {data.daily.map((d: any) => (
            <div key={d.date} className="flex flex-col items-center gap-1 shrink-0" style={{ width: `${Math.max(100 / data.daily.length, 1.5)}%`, minWidth: 6 }}>
              <div
                className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-default"
                style={{ height: `${(d.count / maxDaily) * 140}px`, minHeight: d.count > 0 ? 2 : 0 }}
                title={`${d.date}: ${d.count}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>{data.daily[0]?.date}</span>
          <span>{data.daily[data.daily.length - 1]?.date}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pages */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">{t('analytics.topPages')}</h3>
          {data.topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('analytics.noData')}</p>
          ) : (
            <div className="space-y-3">
              {data.topPages.map((p: any) => (
                <div key={p.path}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-foreground truncate max-w-[70%]">{p.path}</span>
                    <span className="text-muted-foreground">{p.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${(p.count / maxPage) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device / Browser / OS breakdown */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">{t('analytics.deviceBreakdown')}</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" /> {t('analytics.browser')}
              </p>
              {Object.entries(data.browserCounts).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-foreground">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> {t('analytics.device')}
              </p>
              {Object.entries(data.deviceCounts).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-sm py-1">
                  <span className="text-foreground">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per-user activity */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t('analytics.userActivity')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.user')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.role')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.pageViews')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.lastSeen')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.perUser.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-sm">{t('analytics.noData')}</td></tr>
              ) : (
                data.perUser.map((u: any) => (
                  <tr key={u.userId} className="hover:bg-muted/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{u.role}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{u.count}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(u.lastSeen).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent visits */}
      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t('analytics.recentVisits')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.time')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.user')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.page')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('analytics.device')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.recent.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">{t('analytics.noData')}</td></tr>
              ) : (
                data.recent.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{r.userName || t('analytics.anonymous')}</td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{r.path}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{r.browser} / {r.os} / {r.device}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{r.ip || '-'}</td>
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
