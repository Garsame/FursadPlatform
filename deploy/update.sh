#!/usr/bin/env bash
#
# Fursad — deploy the current main branch.
#
#   cd /var/www/fursad/fursad && ./deploy/update.sh
#
# Pulls, installs, rebuilds the frontend, restarts the API, and checks the
# result. Rebuilding matters: the frontend is static files on disk, so a
# restart of Node alone changes nothing a visitor can see.
#
# Safe to run repeatedly. It refuses to deploy on top of uncommitted local
# edits rather than silently discarding or merging them.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="fursad-api"
HEALTH="http://127.0.0.1:5000/"

cd "$REPO"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '\033[32m  ✔ %s\033[0m\n' "$1"; }
warn() { printf '\033[33m  ! %s\033[0m\n' "$1"; }
die()  { printf '\033[31m  ✖ %s\033[0m\n' "$1" >&2; exit 1; }

bold "Fursad deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "  repo: $REPO"

# --- refuse to clobber uncommitted work ------------------------------------
if [ -n "$(git status --porcelain)" ]; then
  git status --short
  die "Uncommitted changes in the working tree. Commit, stash or revert first."
fi

# --- the two files that must exist -----------------------------------------
[ -f backend/.env ]  || die "backend/.env is missing. See deploy/DEPLOY.md phase 4."
[ -f frontend/.env ] || die "frontend/.env is missing. Vite bakes it in at build time — see phase 5."

BEFORE="$(git rev-parse --short HEAD)"

bold "1/5  Pulling"
git pull --ff-only
AFTER="$(git rev-parse --short HEAD)"
if [ "$BEFORE" = "$AFTER" ]; then
  warn "already at $AFTER — rebuilding anyway"
else
  ok "$BEFORE → $AFTER"
  git --no-pager log --oneline "$BEFORE..$AFTER" | sed 's/^/     /'
fi

bold "2/5  Installing dependencies"
# Backend: production only — its sole devDependency is nodemon.
npm --prefix backend install --omit=dev --no-audit --no-fund
# Frontend: devDependencies ARE required. vite and tailwind live there, so
# --omit=dev here would break the build.
npm --prefix frontend install --no-audit --no-fund
ok "installed"

bold "3/5  Building the frontend"
# vite clears dist/ before writing, so the site 404s for the few seconds this
# takes. Acceptable at this size; a blue/green swap is the fix if it ever isn't.
npm run build
[ -f frontend/dist/index.html ] || die "build produced no frontend/dist/index.html"
ok "frontend/dist rebuilt ($(du -sh frontend/dist | cut -f1))"

bold "4/5  Restarting the API"
# --update-env re-reads .env. Without it PM2 keeps the environment it started
# with, and an edited .env looks like it was ignored.
pm2 restart "$APP" --update-env
sleep 3
ok "restarted"

bold "5/5  Health check"
for i in 1 2 3 4 5; do
  if curl -fsS --max-time 5 "$HEALTH" >/dev/null 2>&1; then
    ok "API responding on $HEALTH"
    echo
    pm2 status "$APP"
    bold "Deployed."
    exit 0
  fi
  warn "not up yet (attempt $i/5)"
  sleep 3
done

echo
pm2 logs "$APP" --lines 30 --nostream || true
die "API did not come back. Logs above; the server prints a plain reason when it refuses to start."
