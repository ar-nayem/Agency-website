#!/bin/bash
# Cron entry point for subscription lifecycle mail (7-day reminder and the
# expired notice). Runs daily; both notices are idempotent per expiry date,
# so a double run in one day sends nothing twice.
set -e
cd "$(dirname "$0")/.."

node --env-file=.env.local --import=tsx scripts/subscription-check.ts >> /var/log/subscription-check.log 2>&1
