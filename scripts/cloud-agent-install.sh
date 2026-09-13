#!/usr/bin/env bash
# Cloud Agent install phase: refresh source-derived state after checkout.
# Idempotent and must terminate. System tooling (Docker, Supabase CLI,
# Playwright system libraries) lives in the base environment snapshot; this
# script only prepares repository-dependent state.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# Node dependencies pinned by the lockfile. pnpm is resolved from the
# "packageManager" field in package.json via corepack (enabled in the base
# image), and pnpm-workspace.yaml approves the esbuild/unrs-resolver build
# scripts so a frozen install completes without an interactive prompt.
pnpm install --frozen-lockfile

# Browsers used by the Playwright e2e suite (chromium for desktop, webkit for
# the iPhone 13 mobile project). Downloads are skipped when already present.
pnpm exec playwright install chromium webkit

# Local development environment for the bundled Supabase stack. These are the
# well-known, non-secret Supabase local-dev keys derived from the default JWT
# secret in supabase/config.toml; they are identical on every local install.
if [ ! -f .env ]; then
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

echo "cloud-agent-install: done"
