# Test Assets

This folder contains production-readiness smoke assets that complement the unit tests:

- `k6/saas_smoke.js` checks cached public browse, search, and optional admin login latency.
- Backend unit tests live under `backend/tests`.
- Postman/Newman collections can keep using cookie-based admin auth; tenant paths must use `/t/{tenant_slug}`.
- Production migrations are explicit. Run `python backend/run_migration.py` or the `migrate` service before backend instances start.
- `backend/DDL.sql` is generated from migration/provisioning source of truth. Regenerate with `python backend/scripts/generate_schema_sql.py`.
- Backup verification is explicit. Run `docker compose -f docker-compose.prod.yml --profile ops run --rm restore-check` to restore the latest Restic snapshot into a temporary directory and verify database/upload/search artifacts exist.
- Free plan is intentionally restrictive: 1 admin, 3 categories, 20 headings, 20 contents, 20 MB upload, 25 indexed SEO pages, 5 AI formatting actions per month.
- Local Docker stack now includes `pgbouncer`, `worker`, and `beat` by default so queue-only features (for example admin search reindex) are testable in development.
- Local optional profiles:
  - `observability`: Prometheus + Grafana + Loki + Promtail
  - `ops`: backup + restore-check jobs

Example:

```bash
k6 run -e BASE_URL=https://docs.example.com -e TENANT_SLUG=demo tests/k6/saas_smoke.js
k6 run -e BASE_URL=http://localhost:8000 -e API_PREFIX= -e TENANT_SLUG=demo tests/k6/saas_smoke.js
```

Local stack examples:

```bash
docker compose --env-file .env.local -f docker-compose.local.yml up -d --build
docker compose --env-file .env.local -f docker-compose.local.yml --profile observability up -d
docker compose --env-file .env.local -f docker-compose.local.yml --profile ops run --rm restore-check
```

Migration example:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate
```

DDL drift check:

```bash
PYTHONPATH=backend python backend/scripts/generate_schema_sql.py --check
```

Restore-check example:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile ops run --rm restore-check
```
