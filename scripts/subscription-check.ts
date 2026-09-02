import { prisma } from '@/src/lib/prisma'
import { sendNotification, expiryReminderTemplate, expiredTemplate } from '@/src/lib/email'

// Reminder window, in days before accessExpiresAt.
const REMIND_WITHIN_DAYS = 7

// Both notices are guarded by a "sent for which expiry date" column rather
// than a boolean. Renewing moves accessExpiresAt, so the stored value stops
// matching and the next cycle's mail is armed again automatically — no
// manual reset, and no risk of a renewed customer being told they expired.
export async function runSubscriptionCheck() {
  const now = new Date()
  const horizon = new Date(now.getTime() + REMIND_WITHIN_DAYS * 86400000)

  const orgs = await prisma.organization.findMany({
    where: {
      status: 'ACTIVE',
      accessExpiresAt: { not: null },
    },
    select: {
      id: true, name: true, isTrial: true, accessExpiresAt: true,
      reminderSentForExpiry: true, expiredNoticeSentForExpiry: true,
    },
  })

  const results: string[] = []

  for (const org of orgs) {
    const expiresAt = org.accessExpiresAt!
    const sameDate = (a: Date | null, b: Date) => !!a && a.getTime() === b.getTime()

    if (expiresAt <= now) {
      if (sameDate(org.expiredNoticeSentForExpiry, expiresAt)) continue
      await sendNotification(
        `${org.name}: your ${org.isTrial ? 'trial' : 'subscription'} has ended`,
        expiredTemplate(org.name, expiresAt, org.isTrial),
        org.id
      )
      await prisma.organization.update({
        where: { id: org.id },
        data: { expiredNoticeSentForExpiry: expiresAt },
      })
      results.push(`expired:${org.name}`)
      continue
    }

    if (expiresAt <= horizon) {
      if (sameDate(org.reminderSentForExpiry, expiresAt)) continue
      // Ceil so the final partial day still reads as "1 day", never "0".
      const daysLeft = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000))
      await sendNotification(
        `${org.name}: ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`,
        expiryReminderTemplate(org.name, daysLeft, expiresAt, org.isTrial),
        org.id
      )
      await prisma.organization.update({
        where: { id: org.id },
        data: { reminderSentForExpiry: expiresAt },
      })
      results.push(`reminder:${org.name}(${daysLeft}d)`)
    }
  }

  return { checked: orgs.length, sent: results }
}

if (require.main === module) {
  runSubscriptionCheck()
    .then((r) => console.log(JSON.stringify(r)))
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
