import { prisma } from '@/src/lib/prisma'
import { decryptCredential } from '@/src/lib/credentialCrypto'
import { scanPortal, type PortalStudentRecord } from '@/src/lib/portalConnectors'
import { sendNotification } from '@/src/lib/email'

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

interface LocalRoster {
  byPassport: Map<string, string>
  byName: Map<string, string>
}

async function buildLocalRoster(): Promise<LocalRoster> {
  const students = await prisma.student.findMany({ select: { id: true, passportNo: true, fullName: true } })
  const byPassport = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const s of students) {
    if (s.passportNo) byPassport.set(s.passportNo.toUpperCase().trim(), s.id)
    if (s.fullName) byName.set(normalizeName(s.fullName), s.id)
  }
  return { byPassport, byName }
}

async function scanOnePortal(
  portal: { id: string; loginUrl: string; username: string; passwordEnc: string; name: string; platform: string },
  roster: LocalRoster
) {
  let students: PortalStudentRecord[]
  try {
    const baseUrl = new URL(portal.loginUrl).origin
    const password = decryptCredential(portal.passwordEnc)
    students = await scanPortal(portal.platform, baseUrl, portal.username, password)
  } catch (err: any) {
    await prisma.universityPortal.update({
      where: { id: portal.id },
      data: { lastScanAt: new Date(), lastScanStatus: 'ERROR', lastScanError: String(err?.message || err) },
    })
    return { changes: [] as StatusChange[], error: String(err?.message || err) }
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

function statusChangeHtml(portalName: string, changes: StatusChange[]) {
  const rows = changes
    .map(
      (c) =>
        `<li><strong>${c.passportName || 'Unknown'}</strong> (${c.passportNo || c.externalId}) — ${c.field}: ${c.oldValue ?? '—'} → ${c.newValue ?? '—'}</li>`
    )
    .join('')
  return `<h3>${portalName}</h3><ul>${rows}</ul>`
}

export async function runScan(onlyPortalId?: string) {
  const portals = await prisma.universityPortal.findMany({
    where: onlyPortalId ? { id: onlyPortalId } : { isActive: true },
  })

  let html = ''
  const errors: { portal: string; error: string }[] = []
  const roster = await buildLocalRoster()

  for (const portal of portals) {
    const { changes, error } = await scanOnePortal(portal, roster)
    if (error) errors.push({ portal: portal.name, error })
    if (changes.length) html += statusChangeHtml(portal.name, changes)
  }

  if (errors.length) {
    html += `<h3>Scan Errors</h3><ul>${errors.map((e) => `<li>${e.portal}: ${e.error}</li>`).join('')}</ul>`
  }

  if (html) {
    await sendNotification('University Portal Status Update', `<h2>Portal Scan Results</h2>${html}`)
  }

  await prisma.scanSettings.upsert({
    where: { id: 'global' },
    create: { id: 'global', lastRunAt: new Date() },
    update: { lastRunAt: new Date() },
  })

  return { portalsScanned: portals.length, errors }
}

// The cron entry point. Portals are never scanned as one batch — each tick
// scans at most ONE portal (the one that's been waiting longest), and won't
// even do that unless the configured stagger gap has passed since the last
// individual portal scan. Intended to be invoked frequently (every minute or
// few) so it can act as soon as both the per-portal interval and the stagger
// gap allow, without needing its own precise internal timer.
export async function runScheduledTick() {
  const settings = await prisma.scanSettings.upsert({
    where: { id: 'global' },
    create: { id: 'global' },
    update: {},
  })
  if (!settings.enabled) return { skipped: 'disabled' as const }

  const now = Date.now()
  const staggerMs = (settings.staggerMinutes || 5) * 60 * 1000
  if (settings.lastPortalScanAt && now - settings.lastPortalScanAt.getTime() < staggerMs) {
    return { skipped: 'stagger-wait' as const }
  }

  const portals = await prisma.universityPortal.findMany({ where: { isActive: true } })
  const intervalMs = settings.intervalHours * 3600 * 1000
  const due = portals.filter((p) => !p.lastScanAt || now - p.lastScanAt.getTime() >= intervalMs)
  if (due.length === 0) return { skipped: 'none-due' as const }

  // Oldest-scanned (or never-scanned) portal goes first, so the rotation is fair.
  due.sort((a, b) => (a.lastScanAt?.getTime() || 0) - (b.lastScanAt?.getTime() || 0))
  const portal = due[0]
  // Captured before scanOnePortal overwrites lastScanStatus/lastScanError —
  // used below to tell a brand-new failure apart from the same portal
  // failing the same way it already failed last tick.
  const previousStatus = portal.lastScanStatus
  const previousError = portal.lastScanError

  const roster = await buildLocalRoster()
  const { changes, error } = await scanOnePortal(portal, roster)

  await prisma.scanSettings.update({
    where: { id: 'global' },
    data: { lastPortalScanAt: new Date(), lastRunAt: new Date() },
  })

  const isNewFailure = error && (previousStatus !== 'ERROR' || previousError !== error)
  if (isNewFailure) {
    await sendNotification('University Portal Scan Error', `<h2>${portal.name}</h2><p>${error}</p>`)
  } else if (changes.length) {
    await sendNotification('University Portal Status Update', `<h2>Portal Scan Results</h2>${statusChangeHtml(portal.name, changes)}`)
  }

  return { scanned: portal.name, changesCount: changes.length, error }
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
