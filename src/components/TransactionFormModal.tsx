'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'
import { TRANSACTION_CATEGORIES, PAYMENT_METHODS, TRANSACTION_STATUSES } from '@/src/lib/money'

const CATEGORY_KEYS: Record<string, string> = {
  SERVICE_FEE: 'catServiceFee',
  APPLICATION_FEE: 'catApplicationFee',
  VISA_FEE: 'catVisaFee',
  TUITION_DEPOSIT: 'catTuitionDeposit',
  DOCUMENT_FEE: 'catDocumentFee',
  COMMISSION_PAYOUT: 'catCommissionPayout',
  TRAVEL: 'catTravel',
  ACCOMMODATION: 'catAccommodation',
  MARKETING: 'catMarketing',
  OTHER: 'catOther',
}

const PAYMENT_METHOD_KEYS: Record<string, string> = {
  CASH: 'pmCash',
  BANK_TRANSFER: 'pmBankTransfer',
  ALIPAY: 'pmAlipay',
  WECHAT_PAY: 'pmWechatPay',
  OTHER: 'pmOther',
}

const STATUS_KEYS: Record<string, string> = {
  COMPLETED: 'stCompleted',
  PENDING: 'stPending',
  REFUNDED: 'stRefunded',
}

interface StudentOption {
  id: string
  fullName: string
  serialNumber?: string | null
}

interface TransactionFormModalProps {
  studentId?: string
  students?: StudentOption[]
  editing?: any | null
  onClose: () => void
  onSaved: () => void
}

export function TransactionFormModal({ studentId, students, editing, onClose, onSaved }: TransactionFormModalProps) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    studentId: editing?.studentId || studentId || '',
    type: editing?.type || 'INCOME',
    category: editing?.category || 'SERVICE_FEE',
    amount: editing?.amount?.toString() || '',
    currency: editing?.currency || 'CNY',
    paymentMethod: editing?.paymentMethod || 'BANK_TRANSFER',
    status: editing?.status || 'COMPLETED',
    description: editing?.description || '',
    transactionDate: editing?.transactionDate ? new Date(editing.transactionDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId) { toast.error(t('finance.selectStudent')); return }
    const amountNum = Number(form.amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) { toast.error(t('finance.amount')); return }

    setSaving(true)
    try {
      const url = editing ? `/api/transactions/${editing.id}` : '/api/transactions'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, amount: amountNum }),
      })
      if (!res.ok) throw new Error()
      toast.success(t('finance.saved'))
      onSaved()
    } catch {
      toast.error(t('finance.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-xl border border-border/60 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h3 className="text-base font-semibold text-foreground">
            {editing ? t('finance.editTransaction') : t('finance.addTransaction')}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {students && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.student')}</label>
              <select
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                required
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              >
                <option value="">{t('finance.selectStudent')}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}{s.serialNumber ? ` (${s.serialNumber})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.type')}</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              >
                <option value="INCOME">{t('finance.income')}</option>
                <option value="EXPENSE">{t('finance.expense')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.status')}</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              >
                {TRANSACTION_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`finance.${STATUS_KEYS[s]}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.category')}</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
            >
              {TRANSACTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`finance.${CATEGORY_KEYS[c]}`)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.amount')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.currency')}</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              >
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.paymentMethod')}</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`finance.${PAYMENT_METHOD_KEYS[m]}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.date')}</label>
              <input
                type="date"
                required
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('finance.description')}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('finance.descriptionPlaceholder')}
              rows={2}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition">
              {t('finance.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition text-sm font-medium shadow-sm shadow-indigo-500/20 disabled:opacity-60"
            >
              {t('finance.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { CATEGORY_KEYS, PAYMENT_METHOD_KEYS, STATUS_KEYS }
