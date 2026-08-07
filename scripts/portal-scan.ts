import { prisma } from '@/src/lib/prisma'
import { decryptCredential } from '@/src/lib/credentialCrypto'
import { scanPortal, type PortalStudentRecord } from '@/src/lib/portalConnectors/at0086'
import { sendNotification } from '@/src/lib/email'

interface StatusChange {
  externalId: string
  passportName: string | null
  passportNo: string | null
  field: 'applyStatus' | 'admitStatus'
  oldValue: string | null
  newValue: string | null
}

async function scanOnePortal(portal: { id: string; loginUrl: string; username: string; passwordEnc: string; name: string }) {
  let students: PortalStudentRecord[]
  try {
    const baseUrl = new URL(portal.loginUrl).origin
    const password = decryptCredential(portal.passwordEnc)
    students = await scanPortal(baseUrl, portal.username, password)
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
      const match = await prisma.student.findFirst({ where: { passportNo: s.passportNo } })
      if (match) matchedStudentId = match.id
    }

    await prisma.portalStudentSnapshot.upsert({
      where: { portalId_externalId: { portalId: portal.id, externalId: s.externalId } },
      create: {
        portalId: portal.id, externalId: s.externalId, passportNo: s.passportNo, passportName: s.passportName,
        program: s.program, applyStatus: s.applyStatus, admitStatus: s.admitStatus,
        raw: JSON.stringify(s.raw), matchedStudentId,
      },
      update: {
        passportNo: s.passportNo, passportName: s.passportName, program: s.program,
        applyStatus: s.applyStatus, admitStatus: s.admitStatus, raw: JSON.stringify(s.raw),
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

  for (const portal of portals) {
    const { changes, error } = await scanOnePortal(portal)
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

if (require.main === module) {
  const portalIdArg = process.argv.find((a) => a.startsWith('--portalId='))
  const onlyPortalId = portalIdArg ? portalIdArg.split('=')[1] : undefined

  runScan(onlyPortalId)
    .then((r) => {
      console.log(`Scanned ${r.portalsScanned} portal(s).`)
      if (r.errors.length) console.error('Errors:', r.errors)
    })
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
