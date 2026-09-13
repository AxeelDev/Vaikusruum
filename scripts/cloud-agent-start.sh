#!/usr/bin/env bash
# Cloud Agent start phase: per-boot reconciliation of runtime services.
# Must tolerate restarts, avoid duplicate processes, reach readiness, then
# return. It reconciles the backing services (Docker + the Supabase stack +
# schema/seed) and launches the Next.js dev server in the background so boot
# completes promptly; the server logs to /tmp/next-dev.log.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() { echo "cloud-agent-start: $*"; }

# 1) Docker daemon. The Supabase local stack runs in containers, so the daemon
#    must be up. Nested-container support relies on the fuse-overlayfs storage
#    driver (/etc/docker/daemon.json) and legacy iptables (configured in the
#    base snapshot).
if ! sudo docker info >/dev/null 2>&1; then
  log "starting dockerd"
  sudo bash -c 'nohup dockerd >/var/log/dockerd.log 2>&1 &'
  for _ in $(seq 1 60); do
    if sudo docker info >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi
# Allow the repo user to reach the daemon without a re-login for the docker group.
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
if ! docker info >/dev/null 2>&1; then
  log "ERROR: Docker daemon did not become ready"
  exit 1
fi
log "docker ready"

# 2) Supabase local stack (Postgres, PostgREST, GoTrue auth, Storage, Studio).
#    supabase start reuses existing containers/volumes when present.
if ! supabase status >/dev/null 2>&1; then
  log "starting supabase stack"
  supabase start
fi
log "supabase ready"

# 3) Database schema and seed content. Both the migration runner and the seed
#    scripts are idempotent, so this converges on every boot.
pnpm db:migrate
pnpm seed
pnpm seed:media
log "database migrated and seeded"

# 4) Next.js dev server. Started in the background (logs to /tmp/next-dev.log)
#    so this script returns and boot can complete. A single instance is kept.
if curl -sf -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
  log "dev server already responding on http://127.0.0.1:3000"
elif pgrep -f "next dev" >/dev/null 2>&1; then
  log "dev server process already running"
else
  log "starting Next.js dev server on http://127.0.0.1:3000 (logs: /tmp/next-dev.log)"
  nohup pnpm dev --hostname 127.0.0.1 --port 3000 >/tmp/next-dev.log 2>&1 &
fi

log "done"
