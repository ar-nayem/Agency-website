'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Clock, Eye, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

interface Recipient {
  id: string
  email: string
  name: string
  orgName: string | null
  status: string
  error: string | null
  sentAt: string | null
  openedAt: string | null
  lastOpenedAt: string | null
  openCount: number
}

interface CampaignDetail {
  id: string
  subject: string
  body: string
  status: string
  totalCount: number
  sentCount: number
  failedCount: number
  createdAt: string
  completedAt: string | null
  createdBy: { name: string }
  recipients: Recipient[]
  stats?: { sent: number; opened: number; openRate: number }
}

export default function CampaignDetailPage() {
  const { id } = useParams()
  const { data: session } = useSession()
  const router = useRouter()
  const { t, formatDateTime } = useLanguage()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session && session.user?.actualRole !== 'SUPER_DEVELOPER') {
      router.push('/dashboard')
      return
    }
    if (session) load()
  }, [session, id])

  useEffect(() => {
    if (!campaign || campaign.status !== 'SENDING') return
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [campaign?.status])

  async function load() {
    try {
      const res = await fetch(`/api/platform/campaigns/${id}`, { credentials: 'include' })
      if (res.ok) setCampaign(await res.json())
      else toast.error(t('campaigns.loadFailed'))
    } catch {
      toast.error(t('campaigns.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  function statusIcon(status: string) {
    if (status === 'SENT') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    // A bad address is a different problem from a broken send: it will never
    // succeed on a retry, and the fix is to correct or remove the address.
    if (status === 'INVALID') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    if (status === 'FAILED') return <XCircle className="w-4 h-4 text-rose-500" />
    return <Clock className="w-4 h-4 text-amber-500" />
  }

  if (!session || loading) return <div className="p-8 text-center">{t('common.loading')}</div>
  if (!campaign) return <div className="p-8 text-center">{t('campaigns.loadFailed')}</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard/platform/campaigns" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> {t('campaigns.back')}
      </Link>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 space-y-2">
        <h1 className="text-xl font-bold text-foreground">{campaign.subject}</h1>
        <p className="text-sm text-muted-foreground">
          {t('campaigns.createdBy')}: {campaign.createdBy?.name} · {formatDateTime(campaign.createdAt)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('campaigns.progress')
            .replace('{sent}', String(campaign.sentCount))
            .replace('{failed}', String(campaign.failedCount))
            .replace('{total}', String(campaign.totalCount))}
        </p>
      </div>

      {campaign.stats && campaign.stats.sent > 0 && (
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-foreground">{t('campaigns.openTracking')}</h2>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-3xl font-bold text-foreground">{campaign.stats.openRate}%</span>
            <span className="text-sm text-muted-foreground">
              {t('campaigns.openedOf')
                .replace('{opened}', String(campaign.stats.opened))
                .replace('{sent}', String(campaign.stats.sent))}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(campaign.stats.openRate, 100)}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{t('campaigns.openCaveat')}</p>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.recipientEmail')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.recipientOrg')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.recipientStatus')}</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('campaigns.recipientOpened')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaign.recipients.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60 transition-colors">
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{r.orgName || '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5 text-xs" title={r.error || undefined}>
                      {statusIcon(r.status)} {r.status}
                    </div>
                    {r.error && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[260px] truncate" title={r.error}>
                        {r.error}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {r.openedAt ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <Eye className="w-3.5 h-3.5" />
                        {r.openCount > 1
                          ? t('campaigns.openedTimes').replace('{n}', String(r.openCount))
                          : t('campaigns.openedOnce')}
                        <span className="text-muted-foreground">· {formatDateTime(r.openedAt)}</span>
                      </div>
                    ) : r.status === 'SENT' ? (
                      <span className="text-xs text-muted-foreground">{t('campaigns.notOpened')}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
