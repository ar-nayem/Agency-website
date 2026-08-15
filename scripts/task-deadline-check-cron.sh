#!/bin/bash
# Cron entry point for overdue-task detection. runOverdueCheck() in
# task-deadline-check.ts does the actual work; this wrapper just invokes it
# and logs the result. Cheap to no-op, safe to run frequently (crontab: every
# 15 minutes) — most ticks find nothing overdue.
set -e
cd "$(dirname "$0")/.."

node --env-file=.env.local --import=tsx scripts/task-deadline-check.ts >> /var/log/task-deadline-check.log 2>&1
