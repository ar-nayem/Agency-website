#!/bin/bash
# Cron entry point. All scheduling logic (whether it's enabled, whether the
# per-portal interval has elapsed, whether the stagger gap since the last
# individual portal scan has passed) lives in runScheduledTick() inside
# portal-scan.ts — this wrapper just invokes it and logs the result. Meant
# to run frequently (crontab: every minute) since it's cheap to no-op.
set -e
cd "$(dirname "$0")/.."

node --env-file=.env.local --import=tsx scripts/portal-scan.ts >> /var/log/portal-scan.log 2>&1
