global:
  resolve_timeout: 5m
  smtp_smarthost: "${ALERTMANAGER_SMTP_HOST}:${ALERTMANAGER_SMTP_PORT}"
  smtp_from: "${ALERTMANAGER_SMTP_FROM}"
  smtp_auth_username: "${ALERTMANAGER_SMTP_USER}"
  smtp_auth_password: "${ALERTMANAGER_SMTP_PASSWORD}"
  smtp_require_tls: true

# Uyarı gruplama ve yönlendirme
route:
  group_by: ["alertname", "job", "severity"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: email-admin

  routes:
    # Kritik uyarılar daha sık tekrarlanır
    - matchers:
        - severity = "critical"
      receiver: email-admin
      repeat_interval: 1h

    # Uyarılar daha az sıklıkla tekrarlanır
    - matchers:
        - severity = "warning"
      receiver: email-admin
      repeat_interval: 6h

receivers:
  - name: email-admin
    email_configs:
      - to: "${ALERTMANAGER_ADMIN_EMAIL}"
        send_resolved: true
        html: |
          {{ define "email.docs_platform.html" }}
          <h3>{{ .GroupLabels.alertname }} — {{ .Status | toUpper }}</h3>
          {{ range .Alerts }}
          <p><strong>Önem:</strong> {{ .Labels.severity }}</p>
          <p><strong>Açıklama:</strong> {{ .Annotations.description }}</p>
          <p><strong>Başlangıç:</strong> {{ .StartsAt.Format "2006-01-02 15:04:05 UTC" }}</p>
          {{ end }}
          {{ end }}
        headers:
          Subject: "[Docs Platform] {{ .GroupLabels.alertname }} — {{ .Status | toUpper }}"

# Üst uyarı kritikse alt uyarıları bastır
inhibit_rules:
  - source_matchers:
      - alertname = "BackendDown"
    target_matchers:
      - alertname =~ "HighErrorRate|HighLatency"
    equal: ["job"]

  - source_matchers:
      - alertname = "RedisDown"
    target_matchers:
      - alertname = "RateLimiterFallback"
    equal: []
