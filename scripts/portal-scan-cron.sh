#!/bin/bash
# Cron entry point — checks whether the user-configured interval has elapsed
# since the last run before actually scanning, so the crontab itself can stay
# fixed (every 15 min) while the user changes the interval freely from the UI.
set -e
cd "$(dirname "$0")/.."

DUE=$(node --env-file=.env.local --import=tsx -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const s = await prisma.scanSettings.findUnique({ where: { id: 'global' } });
  if (!s || !s.enabled) { console.log('no'); return; }
  if (!s.lastRunAt) { console.log('yes'); return; }
  const dueAt = new Date(s.lastRunAt).getTime() + s.intervalHours * 3600 * 1000;
  console.log(Date.now() >= dueAt ? 'yes' : 'no');
})().finally(() => prisma.\$disconnect());
" 2>/dev/null | tail -1)

if [ "$DUE" = "yes" ]; then
  node --env-file=.env.local --import=tsx scripts/portal-scan.ts >> /var/log/portal-scan.log 2>&1
fi
