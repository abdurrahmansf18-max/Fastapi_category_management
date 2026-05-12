#!/bin/sh
set -eu

status_dir="${OPS_STATUS_DIR:-/ops-status}"
mkdir -p "${status_dir}"

write_status() {
  ok="$1"
  message="$2"
  checked_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"ok":%s,"checked_at":"%s","message":"%s"}\n' "${ok}" "${checked_at}" "${message}" > "${status_dir}/backup.json"
}

while true; do
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  dump="/tmp/postgres-${stamp}.dump"

  if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "${POSTGRES_HOST}" \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    -Fc \
    -f "${dump}" \
    && restic backup "${dump}" /data/uploads /data/meili \
    && restic forget --keep-daily 14 --keep-weekly 8 --prune; then
    write_status "true" "Backup completed for ${stamp}"
  else
    write_status "false" "Backup failed for ${stamp}"
  fi

  rm -f "${dump}"
  sleep 86400
done
