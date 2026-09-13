#!/usr/bin/env bash
# Cloud Agent start phase: per-boot reconciliation of runtime services.
# Must tolerate restarts, avoid duplicate processes, reach readiness, then
# return. The Next.js dev server is intentionally left to a terminal so its
# logs stay visible.
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

log "done"
