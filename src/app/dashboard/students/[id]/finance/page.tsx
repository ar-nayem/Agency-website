'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Wallet, Clock3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { formatMoney } from '@/src/lib/money'
import { TransactionFormModal, CATEGORY_KEYS, PAYMENT_METHOD_KEYS, STATUS_KEYS } from '@/src/components/TransactionFormModal'

export default function StudentFinancePage() {
  const { id } = useParams()
  const studentId = id as string
  const { t } = useLanguage()
  const [student, setStudent] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  useEffect(() => { fetchAll() }, [studentId])

  async function fetchAll() {
    setLoading(true)
    try {
      const [studentRes, txRes] = await Promise.all([
        fetch(`/api/students/${studentId}`, { credentials: 'include' }),
        fetch(`/api/transactions?studentId=${studentId}`, { credentials: 'include' }),
      ])
      if (studentRes.ok) setStudent(await studentRes.json())
      if (txRes.ok) setTransactions(await txRes.json())
    } catch {
      toast.error(t('finance.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function deleteTransaction(txId: string) {
    if (!confirm(t('finance.deleteConfirm'))) return
    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error()
      toast.success(t('finance.deleted'))
      fetchAll()
    } catch {
      toast.error(t('finance.deleteFailed'))
    }
  }

  const totals = useMemo(() => {
    let charged = 0, spent = 0, outstanding = 0
    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        if (tx.status === 'COMPLETED') charged += tx.amount
        else if (tx.status === 'PENDING') outstanding += tx.amount
      } else if (tx.status === 'COMPLETED') {
        spent += tx.amount
      }
    }
    return { charged, spent, profit: charged - spent, outstanding }
  }, [transactions])

  const getStatusBadge = (status: string) => ({
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200',
    REFUNDED: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400 border-slate-200',
  }[status] || 'bg-muted text-foreground border-border')

  if (loading) return <div className="p-10 text-center text-muted-foreground">{t('common.loading')}</div>
  if (!student) return <div className="p-10 text-center text-muted-foreground">{t('students.studentNotFound')}</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start gap-4 mb-8">
        <Link href={`/dashboard/students/${studentId}`} className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{t('finance.title')} — {student.fullName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{student.serialNumber || student.mainEmail}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true) }} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium shadow-sm shadow-indigo-500/20 shrink-0">
          <Plus className="w-4 h-4" /> {t('finance.addTransaction')}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4">
          <div className="flex items-center gap-2 text-emerald-600 mb-1"><TrendingUp className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wider">{t('finance.totalCharged')}</span></div>
          <p className="text-xl font-bold text-foreground">{formatMoney(totals.charged)}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4">
          <div className="flex items-center gap-2 text-rose-600 mb-1"><TrendingDown className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wider">{t('finance.totalSpent')}</span></div>
          <p className="text-xl font-bold text-foreground">{formatMoney(totals.spent)}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-1"><Wallet className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wider">{t('finance.netProfit')}</span></div>
          <p className={`text-xl font-bold ${totals.profit >= 0 ? 'text-foreground' : 'text-rose-600'}`}>{formatMoney(totals.profit)}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1"><Clock3 className="w-4 h-4" /><span className="text-[11px] font-semibold uppercase tracking-wider">{t('finance.outstanding')}</span></div>
          <p className="text-xl font-bold text-amber-600">{formatMoney(totals.outstanding)}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{t('finance.allTransactions')}</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t('finance.noTransactions')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('finance.noTransactionsHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('finance.date')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('finance.category')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('finance.paymentMethod')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('finance.amount')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('finance.status')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('finance.description')}</th>
                  <th className="px-6 py-3.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/60 transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{t(`finance.${CATEGORY_KEYS[tx.category]}`)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{tx.paymentMethod ? t(`finance.${PAYMENT_METHOD_KEYS[tx.paymentMethod]}`) : '-'}</td>
                    <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(tx.status)}`}>
                        {t(`finance.${STATUS_KEYS[tx.status]}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px] truncate">{tx.description || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditing(tx); setShowModal(true) }} className="text-indigo-600 hover:text-indigo-700 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors inline-flex">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteTransaction(tx.id)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors inline-flex">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TransactionFormModal
          studentId={studentId}
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchAll() }}
        />
      )}
    </div>
  )
}
