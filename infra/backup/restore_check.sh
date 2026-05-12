#!/bin/sh
set -eu

status_dir="${OPS_STATUS_DIR:-/ops-status}"
mkdir -p "${status_dir}"

write_status() {
  ok="$1"
  message="$2"
  checked_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"ok":%s,"checked_at":"%s","message":"%s"}\n' "${ok}" "${checked_at}" "${message}" > "${status_dir}/restore-check.json"
}

fail() {
  write_status "false" "$1"
  echo "$1"
  exit 1
}

target="${RESTORE_CHECK_DIR:-/tmp/docs-platform-restore-check}"
rm -rf "${target}"
mkdir -p "${target}"

restic snapshots --latest 1 >/tmp/latest-snapshot.txt || fail "Restore check failed: could not list restic snapshots"
snapshot_id="$(awk 'NR==3 {print $1}' /tmp/latest-snapshot.txt)"
if [ -z "${snapshot_id}" ] || [ "${snapshot_id}" = "ID" ]; then
  fail "No restic snapshot found"
fi

restic restore "${snapshot_id}" --target "${target}" || fail "Restore check failed: could not restore snapshot ${snapshot_id}"

if ! find "${target}" -name "postgres-*.dump" -type f | grep -q .; then
  fail "Restore check failed: postgres dump is missing"
fi

if [ ! -d "${target}/data/uploads" ]; then
  fail "Restore check failed: uploads directory is missing"
fi

if [ ! -d "${target}/data/meili" ]; then
  fail "Restore check failed: Meilisearch data directory is missing"
fi

write_status "true" "Restore check passed for snapshot ${snapshot_id}"
echo "Restore check passed for snapshot ${snapshot_id}"
