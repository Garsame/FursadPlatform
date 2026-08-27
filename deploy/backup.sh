#!/usr/bin/env bash
#
# Fursad — nightly backup of the database and the uploaded files.
#
# The uploads directory holds real people's CVs and photographs. It is not in
# git (deliberately — it is personal data and the remote is public), so this
# script is the only thing standing between a disk failure and losing them.
#
# Cron:  30 2 * * * /var/www/fursad/fursad/deploy/backup.sh >> /var/log/fursad-backup.log 2>&1

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="/var/backups/fursad"
KEEP_DAYS=14
STAMP="$(date +%Y-%m-%d_%H%M)"
DB="Fursad_Platform"

mkdir -p "$DEST"
echo "=== Fursad backup $STAMP ==="

# --- database --------------------------------------------------------------
# --archive --gzip writes one compressed file rather than a directory tree,
# which is far easier to copy off the box later.
mongodump --db="$DB" --archive="$DEST/db-$STAMP.archive.gz" --gzip --quiet
echo "  db      $(du -h "$DEST/db-$STAMP.archive.gz" | cut -f1)"

# --- uploaded files --------------------------------------------------------
if [ -d "$REPO/backend/uploads" ]; then
  tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$REPO/backend" uploads
  echo "  uploads $(du -h "$DEST/uploads-$STAMP.tar.gz" | cut -f1)"
else
  echo "  uploads directory not found — skipped"
fi

# --- prune -----------------------------------------------------------------
find "$DEST" -name 'db-*.archive.gz'  -mtime "+$KEEP_DAYS" -delete
find "$DEST" -name 'uploads-*.tar.gz' -mtime "+$KEEP_DAYS" -delete

echo "  kept    $(find "$DEST" -type f | wc -l) file(s), last $KEEP_DAYS days"
echo "  disk    $(df -h "$DEST" | awk 'NR==2 {print $4" free"}')"
echo

# ---------------------------------------------------------------------------
# To restore:
#   mongorestore --archive=/var/backups/fursad/db-DATE.archive.gz --gzip --drop
#   tar -xzf /var/backups/fursad/uploads-DATE.tar.gz -C /var/www/fursad/fursad/backend
#
# These copies sit on the SAME machine as the data. Copy them off-site — even
# `scp` to your laptop on a schedule — or a disk failure takes both.
# ---------------------------------------------------------------------------
