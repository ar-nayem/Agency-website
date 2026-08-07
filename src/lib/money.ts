export function formatMoney(amount: number, currency: string = 'CNY') {
  const symbols: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€', GBP: '£' }
  const symbol = symbols[currency] || currency + ' '
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const TRANSACTION_CATEGORIES = [
  'SERVICE_FEE',
  'APPLICATION_FEE',
  'VISA_FEE',
  'TUITION_DEPOSIT',
  'DOCUMENT_FEE',
  'COMMISSION_PAYOUT',
  'TRAVEL',
  'ACCOMMODATION',
  'MARKETING',
  'OTHER',
] as const

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'ALIPAY', 'WECHAT_PAY', 'OTHER'] as const

export const TRANSACTION_STATUSES = ['COMPLETED', 'PENDING', 'REFUNDED'] as const
