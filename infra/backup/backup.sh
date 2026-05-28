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

# Meilisearch native snapshot oluştur ve tamamlanmasını bekle
trigger_meili_snapshot() {
  if [ -z "${MEILISEARCH_URL:-}" ] || [ -z "${MEILISEARCH_API_KEY:-}" ]; then
    echo "Meilisearch URL/KEY eksik, snapshot atlanıyor."
    return 0
  fi

  echo "Meilisearch snapshot tetikleniyor..."
  response=$(wget -qO- \
    --header="Authorization: Bearer ${MEILISEARCH_API_KEY}" \
    --post-data="" \
    "${MEILISEARCH_URL}/snapshots" 2>/dev/null || true)

  if [ -z "${response}" ]; then
    echo "Meilisearch snapshot API'si yanıt vermedi, devam ediliyor."
    return 0
  fi

  task_uid=$(echo "${response}" | grep -o '"taskUid":[0-9]*' | grep -o '[0-9]*' || true)
  if [ -z "${task_uid}" ]; then
    echo "Snapshot task UID alınamadı, devam ediliyor."
    return 0
  fi

  echo "Snapshot task başlatıldı (uid=${task_uid}), tamamlanması bekleniyor..."
  max_wait=120
  elapsed=0
  while [ "${elapsed}" -lt "${max_wait}" ]; do
    status_resp=$(wget -qO- \
      --header="Authorization: Bearer ${MEILISEARCH_API_KEY}" \
      "${MEILISEARCH_URL}/tasks/${task_uid}" 2>/dev/null || true)

    task_status=$(echo "${status_resp}" | grep -o '"status":"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || true)

    if [ "${task_status}" = "succeeded" ]; then
      echo "Meilisearch snapshot tamamlandı."
      return 0
    elif [ "${task_status}" = "failed" ] || [ "${task_status}" = "canceled" ]; then
      echo "Meilisearch snapshot başarısız: ${task_status}"
      return 0  # snapshot başarısız olsa bile backup devam eder
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done

  echo "Meilisearch snapshot zaman aşımına uğradı, devam ediliyor."
  return 0
}

while true; do
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  dump="/tmp/postgres-${stamp}.dump"

  # 1. Meilisearch native snapshot (volume backup öncesi tutarlı snapshot)
  trigger_meili_snapshot

  # 2. PostgreSQL dump
  # 3. Restic backup (postgres dump + uploads + meili data/snapshots dahil)
  if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
      -h "${POSTGRES_HOST}" \
      -U "${POSTGRES_USER}" \
      -d "${POSTGRES_DB}" \
      -Fc \
      -f "${dump}" \
    && restic backup "${dump}" /data/uploads /data/meili \
    && restic forget --keep-daily 14 --keep-weekly 8 --prune; then
    write_status "true" "Backup completed for ${stamp}"
    echo "Backup tamamlandı: ${stamp}"
  else
    write_status "false" "Backup failed for ${stamp}"
    echo "Backup BAŞARISIZ: ${stamp}" >&2
  fi

  rm -f "${dump}"
  # 24 saatte bir yedekle
  sleep 86400
done
