import { prisma } from '@/src/lib/prisma'
import { decryptCredential } from '@/src/lib/credentialCrypto'
import { scanPortal, type PortalStudentRecord } from '@/src/lib/portalConnectors'
import { sendNotification } from '@/src/lib/email'
import { categorizeAdmitStatus, CATEGORY_LABELS } from '@/src/lib/portalStatus'

interface StatusChange {
  externalId: string
  passportName: string | null
  passportNo: string | null
  field: 'applyStatus' | 'admitStatus'
  oldValue: string | null
  newValue: string | null
}

function normalizeName(name: string | null | undefined): string {
  return (name || '').toUpperCase().replace(/\s+/g, ' ').trim()
}

// The VPS this runs on is memory-constrained and each AT0086 scan spins up a
// CPU-heavy OCR worker to solve the login captcha — under load that can stall
// the event loop long enough for the network fetch to time out or reset,
// which Node reports as a generic "fetch failed"/ECONNRESET/ETIMEDOUT. That's
// a transient hiccup, not the portal being down or blocking us — worth a
// couple of retries before we record a real ERROR and alert the developer.
// A genuine login failure (wrong password, account issue) surfaces as its
// own message from at0086.ts's login(), not one of these, so it still fails
// immediately without wasting retries or risking the site's lockout counter.
const TRANSIENT_ERROR_PATTERN = /fetch failed|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|socket hang up|network/i

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface LocalRoster {
  byPassport: Map<string, string>
  byName: Map<string, string>
}

// Scoped per-org — a portal scan matching against every org's students would
// let one org's portal data get linked to another org's student records.
async function buildLocalRoster(organizationId: string): Promise<LocalRoster> {
  const students = await prisma.student.findMany({ where: { organizationId }, select: { id: true, passportNo: true, fullName: true } })
  const byPassport = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const s of students) {
    if (s.passportNo) byPassport.set(s.passportNo.toUpperCase().trim(), s.id)
    if (s.fullName) byName.set(normalizeName(s.fullName), s.id)
  }
  return { byPassport, byName }
}

async function scanOnePortal(
  portal: { id: string; loginUrl: string; username: string; passwordEnc: string; name: string; platform: string; useProxy: boolean; organizationId: string | null },
  roster: LocalRoster
) {
  let students: PortalStudentRecord[] | undefined
  let lastError = ''
  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const baseUrl = new URL(portal.loginUrl).origin
      const password = decryptCredential(portal.passwordEnc)
      students = await scanPortal(portal.platform, baseUrl, portal.username, password, portal.useProxy)
      break
    } catch (err: any) {
      lastError = String(err?.message || err)
      if (attempt < maxAttempts && TRANSIENT_ERROR_PATTERN.test(lastError)) {
        await sleep(attempt * 4000) // 4s, then 8s — gives the OCR-driven CPU spike time to pass
        continue
      }
      await prisma.universityPortal.update({
        where: { id: portal.id },
        data: { lastScanAt: new Date(), lastScanStatus: 'ERROR', lastScanError: lastError },
      })
      return { changes: [] as StatusChange[], error: lastError }
    }
  }
  if (!students) {
    // Unreachable in practice (the loop always either breaks with students set
    // or returns above) — satisfies TypeScript's control-flow analysis.
    return { changes: [] as StatusChange[], error: lastError || 'Unknown scan error' }
  }

  const changes: StatusChange[] = []

  for (const s of students) {
    const existing = await prisma.portalStudentSnapshot.findUnique({
      where: { portalId_externalId: { portalId: portal.id, externalId: s.externalId } },
    })

    if (existing) {
      if (existing.applyStatus !== s.applyStatus) {
        changes.push({
          externalId: s.externalId, passportName: s.passportName, passportNo: s.passportNo,
          field: 'applyStatus', oldValue: existing.applyStatus, newValue: s.applyStatus,
        })
      }
      if (existing.admitStatus !== s.admitStatus) {
        changes.push({
          externalId: s.externalId, passportName: s.passportName, passportNo: s.passportNo,
          field: 'admitStatus', oldValue: existing.admitStatus, newValue: s.admitStatus,
        })
      }
    }

    let matchedStudentId = existing?.matchedStudentId ?? null
    if (!matchedStudentId && s.passportNo) {
      matchedStudentId = roster.byPassport.get(s.passportNo.toUpperCase().trim()) || null
    }
    if (!matchedStudentId && s.passportName) {
      matchedStudentId = roster.byName.get(normalizeName(s.passportName)) || null
    }

    await prisma.portalStudentSnapshot.upsert({
      where: { portalId_externalId: { portalId: portal.id, externalId: s.externalId } },
      create: {
        portalId: portal.id, externalId: s.externalId, passportNo: s.passportNo, passportName: s.passportName,
        program: s.program, applyStatus: s.applyStatus, admitStatus: s.admitStatus,
        appliedAt: s.appliedAt ? new Date(s.appliedAt) : null,
        raw: JSON.stringify(s.raw), matchedStudentId,
      },
      update: {
        passportNo: s.passportNo, passportName: s.passportName, program: s.program,
        applyStatus: s.applyStatus, admitStatus: s.admitStatus,
        appliedAt: s.appliedAt ? new Date(s.appliedAt) : undefined,
        raw: JSON.stringify(s.raw),
        lastSeenAt: new Date(), matchedStudentId,
      },
    })
  }

  for (const c of changes) {
    await prisma.portalStatusChangeLog.create({
      data: { portalId: portal.id, ...c },
    })
  }

  await prisma.universityPortal.update({
    where: { id: portal.id },
    data: { lastScanAt: new Date(), lastScanStatus: 'SUCCESS', lastScanError: null, lastScanCount: students.length },
  })

  return { changes, error: null as string | null }
}

function statusChangeHtml(portalName: string, portalId: string, changes: StatusChange[]) {
  const rows = changes
    .map((c) => {
      const fieldLabel = c.field === 'admitStatus' ? 'Admit Status' : 'Apply Status'
      const [oldLabel, newLabel] = c.field === 'admitStatus'
        ? [CATEGORY_LABELS[categorizeAdmitStatus(c.oldValue, portalId)], CATEGORY_LABELS[categorizeAdmitStatus(c.newValue, portalId)]]
        : [c.oldValue ?? '—', c.newValue ?? '—']
      return `<li><strong>${c.passportName || 'Unknown'}</strong> (${c.passportNo || c.externalId}) — ${fieldLabel}: ${oldLabel} → ${newLabel}</li>`
    })
    .join('')
  return `<h3>${portalName}</h3><ul>${rows}</ul>`
}

export async function runScan(onlyPortalId?: string) {
  const portals = await prisma.universityPortal.findMany({
    where: onlyPortalId ? { id: onlyPortalId } : { isActive: true },
  })

  // Grouped by org so each org's roster-matching and notification stays
  // within its own data, even in the (currently unreachable via any route —
  // the manual-scan API always passes a single portal id) all-active-portals
  // branch below.
  const errors: { portal: string; error: string }[] = []
  const htmlByOrg = new Map<string, string>()
  const rosterByOrg = new Map<string, LocalRoster>()

  for (const portal of portals) {
    const orgId = portal.organizationId
    if (!orgId) continue // orphaned portal with no org — shouldn't happen post-migration, skip defensively
    let roster = rosterByOrg.get(orgId)
    if (!roster) {
      roster = await buildLocalRoster(orgId)
      rosterByOrg.set(orgId, roster)
    }
    const { changes, error } = await scanOnePortal(portal, roster)
    if (error) errors.push({ portal: portal.name, error })
    if (changes.length) {
      htmlByOrg.set(orgId, (htmlByOrg.get(orgId) || '') + statusChangeHtml(portal.name, portal.id, changes))
    }
  }

  for (const orgId of Array.from(htmlByOrg.keys())) {
    await sendNotification('University Portal Status Update', `<h2>Portal Scan Results</h2>${htmlByOrg.get(orgId)}`, orgId)
  }

  const scannedOrgIds = Array.from(new Set(portals.map((p) => p.organizationId).filter((id): id is string => !!id)))
  for (const orgId of scannedOrgIds) {
    await prisma.scanSettings.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, lastRunAt: new Date() },
      update: { lastRunAt: new Date() },
    })
  }

  return { portalsScanned: portals.length, errors }
}

// The cron entry point. Each org is independent: every tick, every ACTIVE
// org gets a chance to scan at most ONE of its own portals (the one that's
// been waiting longest), gated by that org's own stagger/interval settings —
// one org's scan volume or a slow/broken portal never blocks another org's
// turn. Within an org this preserves the original single-portal-per-tick
// rate-limiting design (intended to be invoked frequently, every minute or
// few, so it can act as soon as both the interval and stagger gap allow).
export async function runScheduledTick() {
  const orgs = await prisma.organization.findMany({ where: { status: 'ACTIVE' }, select: { id: true } })
  const results: Array<{ orgId: string; skipped?: string; scanned?: string; changesCount?: number; error?: string | null }> = []

  for (const org of orgs) {
    const settings = await prisma.scanSettings.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id },
      update: {},
    })
    if (!settings.enabled) {
      results.push({ orgId: org.id, skipped: 'disabled' })
      continue
    }

    const now = Date.now()
    const staggerMs = (settings.staggerMinutes || 5) * 60 * 1000
    if (settings.lastPortalScanAt && now - settings.lastPortalScanAt.getTime() < staggerMs) {
      results.push({ orgId: org.id, skipped: 'stagger-wait' })
      continue
    }

    const portals = await prisma.universityPortal.findMany({ where: { isActive: true, organizationId: org.id } })
    const intervalMs = settings.intervalHours * 3600 * 1000
    const due = portals.filter((p) => !p.lastScanAt || now - p.lastScanAt.getTime() >= intervalMs)
    if (due.length === 0) {
      results.push({ orgId: org.id, skipped: 'none-due' })
      continue
    }

    // Oldest-scanned (or never-scanned) portal goes first, so the rotation is fair.
    due.sort((a, b) => (a.lastScanAt?.getTime() || 0) - (b.lastScanAt?.getTime() || 0))
    const portal = due[0]
    // Captured before scanOnePortal overwrites lastScanStatus/lastScanError —
    // used below to tell a brand-new failure apart from the same portal
    // failing the same way it already failed last tick.
    const previousStatus = portal.lastScanStatus
    const previousError = portal.lastScanError

    const roster = await buildLocalRoster(org.id)
    const { changes, error } = await scanOnePortal(portal, roster)

    await prisma.scanSettings.update({
      where: { organizationId: org.id },
      data: { lastPortalScanAt: new Date(), lastRunAt: new Date() },
    })

    const isNewFailure = error && (previousStatus !== 'ERROR' || previousError !== error)
    if (isNewFailure) {
      await sendNotification('University Portal Scan Error', `<h2>${portal.name}</h2><p>${error}</p>`, org.id)
    } else if (changes.length) {
      await sendNotification('University Portal Status Update', `<h2>Portal Scan Results</h2>${statusChangeHtml(portal.name, portal.id, changes)}`, org.id)
    }

    results.push({ orgId: org.id, scanned: portal.name, changesCount: changes.length, error })
  }

  return results
}

if (require.main === module) {
  const portalIdArg = process.argv.find((a) => a.startsWith('--portalId='))
  const onlyPortalId = portalIdArg ? portalIdArg.split('=')[1] : undefined

  const task = onlyPortalId
    ? runScan(onlyPortalId).then((r) => {
        console.log(`Scanned ${r.portalsScanned} portal(s).`)
        if (r.errors.length) console.error('Errors:', r.errors)
      })
    : runScheduledTick().then((r) => {
        console.log(JSON.stringify(r))
      })

  task.catch(console.error).finally(() => prisma.$disconnect())
}
