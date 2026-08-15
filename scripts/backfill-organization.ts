// One-off backfill for the multi-tenant migration (Milestone 1, Phase 1a).
// Creates the single real Organization for the existing business and points
// every pre-existing row at it. Safe to re-run (idempotent on the org itself
// via slug lookup); row updates are unconditional "set to this org" writes.
import { prisma } from '@/src/lib/prisma'

const ORG_NAME = 'Chengdu Dream Fly Edu'
const ORG_SLUG = 'chengdu-dream-fly-edu'

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: { name: ORG_NAME, slug: ORG_SLUG, status: 'ACTIVE', planTier: 'INTERNAL' },
  })
  console.log(`Organization: ${org.id} (${org.name})`)

  const results: Record<string, number> = {}

  results.User = (await prisma.user.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.Student = (await prisma.student.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.Document = (await prisma.document.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.Transaction = (await prisma.transaction.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.Message = (await prisma.message.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.UniversityPortal = (await prisma.universityPortal.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.Offer = (await prisma.offer.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.ActivityLog = (await prisma.activityLog.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.DocumentRequirement = (await prisma.documentRequirement.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count
  results.FieldRequirement = (await prisma.fieldRequirement.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })).count

  // OrganizationProfile: only the real OWNER's row is meaningful (matches the
  // `?owner=true` lookup pattern the app already uses). The other rows found
  // locally belong to the demo seed accounts (admin@glorie.com, agent@glorie.com)
  // and are unused test cruft — dropped so the org can carry a single 1:1 profile.
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER', organizationId: org.id } })
  if (owner) {
    const deleted = await prisma.organizationProfile.deleteMany({ where: { userId: { not: owner.id } } })
    results.OrganizationProfile_orphans_deleted = deleted.count
    const kept = await prisma.organizationProfile.updateMany({ where: { userId: owner.id }, data: { organizationId: org.id } })
    results.OrganizationProfile_kept = kept.count
  }

  const scanSettings = await prisma.scanSettings.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } })
  results.ScanSettings = scanSettings.count

  console.log(JSON.stringify(results, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
