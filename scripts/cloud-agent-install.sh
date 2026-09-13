#!/usr/bin/env bash
# Cloud Agent install phase: prepare the environment after checkout.
#
# This is written to be reproducible from Cursor's default base image, so it
# provisions the system tooling the app needs (Docker for the local Supabase
# stack, the Supabase CLI, nested-container networking bits, Playwright
# libraries) in addition to the Node dependencies. Every step is idempotent
# and the script must terminate (no long-running daemons are left running).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() { echo "cloud-agent-install: $*"; }

# ---------------------------------------------------------------------------
# 1) System packages needed for nested Docker + Playwright.
# ---------------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "installing Docker Engine and container prerequisites"
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -qq
  # fuse-overlayfs lets Docker use an overlay storage driver inside the nested
  # (already-overlay) VM filesystem. --force-confold answers the fuse.conf
  # dpkg prompt non-interactively.
  sudo apt-get install -y -qq -o Dpkg::Options::=--force-confold \
    ca-certificates curl gnupg fuse-overlayfs iptables uidmap

  sudo install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  log "Docker already installed"
fi

# Docker daemon config: fuse-overlayfs storage driver, classic graph driver
# (the containerd snapshotter cannot mount overlay inside this nested VM).
sudo mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ] || ! grep -q fuse-overlayfs /etc/docker/daemon.json 2>/dev/null; then
  log "writing /etc/docker/daemon.json"
  echo '{
  "storage-driver": "fuse-overlayfs",
  "features": { "containerd-snapshotter": false }
}' | sudo tee /etc/docker/daemon.json >/dev/null
fi

# Docker's bridge NAT and embedded DNS need the legacy iptables backend; the
# nftables backend does not apply the rules correctly in this nested VM.
if command -v iptables-legacy >/dev/null 2>&1; then
  sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
  sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true
fi

# Let the repo user reach the Docker socket without a group re-login.
sudo groupadd -f docker >/dev/null 2>&1 || true
sudo usermod -aG docker "$(id -un)" >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# 2) Supabase CLI (local Postgres/PostgREST/Auth/Storage stack).
# ---------------------------------------------------------------------------
if ! command -v supabase >/dev/null 2>&1; then
  log "installing Supabase CLI"
  arch="$(dpkg --print-architecture)"
  ver="$(curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest \
    | grep -oP '"tag_name":\s*"\K[^"]+')"
  curl -fsSL "https://github.com/supabase/cli/releases/download/${ver}/supabase_${ver#v}_linux_${arch}.deb" \
    -o /tmp/supabase.deb
  sudo dpkg -i /tmp/supabase.deb
  rm -f /tmp/supabase.deb
else
  log "Supabase CLI already installed"
fi

# ---------------------------------------------------------------------------
# 3) Node dependencies. pnpm is resolved from package.json "packageManager"
#    via corepack; pnpm-workspace.yaml approves the esbuild/unrs-resolver build
#    scripts so a frozen install completes without an interactive prompt.
# ---------------------------------------------------------------------------
log "installing Node dependencies"
pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# 4) Playwright browsers + their system libraries (chromium for desktop,
#    webkit for the iPhone 13 mobile project).
# ---------------------------------------------------------------------------
log "installing Playwright browsers and system libraries"
pw_cli="$(find node_modules/.pnpm -path '*node_modules/playwright/cli.js' 2>/dev/null | head -1)"
if [ -n "$pw_cli" ]; then
  sudo "$(command -v node)" "$pw_cli" install-deps >/dev/null 2>&1 || true
fi
pnpm exec playwright install chromium webkit

# ---------------------------------------------------------------------------
# 5) Local development environment for the bundled Supabase stack. These are
#    the well-known, non-secret Supabase local-dev keys derived from the
#    default JWT secret in supabase/config.toml; identical on every install.
# ---------------------------------------------------------------------------
if [ ! -f .env ]; then
  log "writing .env for the local Supabase stack"
  cat > .env <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
RESEND_API_KEY=
CONTACT_NOTIFICATION_EMAIL=
EOF
fi

log "done"
