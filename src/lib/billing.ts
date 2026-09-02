// Billing vocabulary shared by the package and payment routes and the
// platform UI. Kept out of the route files themselves: a Next.js route
// module may only export its handlers and a fixed set of config fields,
// so exporting a constant from one fails the production build.
export const BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'ALIPAY', 'WECHAT', 'CASH', 'OTHER'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
