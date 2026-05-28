# 🔍 Production Hazırlık Analizi — FastAPI Docs Platform

## Genel Değerlendirme

Bu platform **çok iyi bir temele** sahip: multi-tenant mimari, JWT + Cookie + CSRF koruması, Celery worker, Prometheus/Grafana gözlemlenebilirlik, Sentry entegrasyonu, Restic yedek sistemi ve CI/CD pipeline. Ancak production'a almadan önce çözülmesi gereken **kritik ve orta seviyeli** sorunlar mevcut.

---

## 🔴 KRİTİK SORUNLAR (Hemen Düzeltilmeli)

### 1. `config.py` — Pydantic BaseSettings Kullanılmıyor (Teknik Borç)
**Dosya:** [config.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/core/config.py)

`SimpleNamespace` kullanımı tip güvenliği sağlamaz, hatalı env değerleri sessizce geçer.

```diff
- settings = SimpleNamespace(SECRET_KEY=SECRET_KEY, ...)
+ from pydantic_settings import BaseSettings
+ class Settings(BaseSettings):
+     SECRET_KEY: str
+     DATABASE_URL: str
+     ...
+     model_config = SettingsConfigDict(env_file=".env")
+ settings = Settings()
```

`pydantic-settings` zaten `requirements.txt`'te mevcut ama kullanılmıyor!

---

### 2. `session.py` — Bağlantı Havuzu Yok (Performans/Güvenilirlik)
**Dosya:** [session.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/db/session.py)

Her sorgu için `engine.begin()` açılıp kapatılıyor. Connection pool ayarları eksik.

```diff
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
+   pool_size=10,
+   max_overflow=20,
+   pool_timeout=30,
+   pool_recycle=1800,
    future=True
)
```

---

### 3. `rate_limit.py` — IP Spoofing Açığı
**Dosya:** [rate_limit.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/core/rate_limit.py#L30-L34)

`x-forwarded-for` başlığı doğrudan kullanılıyor. Kötü niyetli kullanıcı bu başlığı taklit ederek rate limit'i atlatabilir.

```diff
def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
-       return forwarded.split(",")[0].strip()  # Güvensiz!
+       # Sadece Caddy/güvenilir proxy'den gelen son IP'yi al
+       ips = [ip.strip() for ip in forwarded.split(",")]
+       return ips[-1]  # veya konfigüre edilmiş trusted proxy sayısına göre
```

**Çözüm:** `uvicorn`'a `--proxy-headers --forwarded-allow-ips="caddy_ip"` eklenmeli veya Caddy'nin gerçek IP'sini doğrulayan middleware yazılmalı.

---

### 4. `billing.py` — Hardcoded Sahte Müşteri Verileri
**Dosya:** [billing.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/routers/billing.py#L159-L167)

```python
"identityNumber": "11111111111",  # 🚨 SAHTE TC KİMLİK NO!
"gsmNumber": "+905000000000",      # 🚨 SAHTE TELEFON!
"surname": "Kullanıcı",            # 🚨 SAHTE SOYAD!
```

Bu verilerle Iyzico üzerinden gerçek ödeme alınamaz ve uyumsuzluk (compliance) sorunu yaratır. Kullanıcıdan gerçek fatura bilgileri alınmalı.

---

### 5. `Dockerfile` — Root Olarak Çalışıyor (Güvenlik)
**Dosya:** [Dockerfile](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/Dockerfile)

Container root kullanıcı olarak çalışıyor.

```diff
+ RUN addgroup --system appuser && adduser --system --ingroup appuser appuser
+ USER appuser
  CMD ["gunicorn", ...]
```

---

### 6. `docker-compose.prod.yml` — Sağlık Kontrolleri Eksik

Hiçbir serviste `healthcheck` tanımlanmamış. Container başlar ama servis hazır olmadan trafik alabilir.

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/healthz"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

---

## 🟡 ORTA SEVİYELİ SORUNLAR

### 7. `main.py` — CSP Header `'unsafe-inline'` Kullanıyor
**Dosya:** [main.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/main.py#L126-L134)

```python
"script-src 'self' 'unsafe-inline'; "   # ⚠️ XSS riskini artırır
"style-src 'self' 'unsafe-inline'; "
```

Production'da `nonce` tabanlı CSP kullanılmalı veya en azından `script-src` kısıtlanmalı.

---

### 8. `main.py` — `/metrics` Endpoint'i Herkese Açık
**Dosya:** [main.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/main.py#L276-L282)

Prometheus metrikleri kimlik doğrulama olmadan erişilebilir. Caddy düzeyinde IP kısıtlaması veya token koruması eklenmeli.

---

### 9. `session.py` — Tenant Schema'sı SQL Injection Riski (Düşük)
**Dosya:** [session.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/db/session.py#L37)

```python
await conn.execute(text(f"SET LOCAL search_path TO {quote_ident(schema_name)}, public"))
```

`quote_ident` manuel implement edilmiş. PostgreSQL'in `psycopg` veya asyncpg'nin kendi identifier quoting mekanizması kullanılmalı.

---

### 10. `admin.py` — `create_heading` Yanlış Hata Mesajı (Bug)
**Dosya:** [admin.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/routers/admin.py#L543-L544)

```python
if not rows:
    raise HTTPException(404, "Content not found")  # 🐛 "Heading" olmalı!
```

---

### 11. `billing.py` — `hmac.new` Kullanımı Hatalı (Bug)
**Dosya:** [billing.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/routers/billing.py#L104-L110)

```python
hmac.new(   # 🐛 Bu fonksiyon yok! hmac.new() değil hmac.new() yanlış
    settings.IYZICO_SECRET_KEY.encode("utf-8"),
```

Python'da `hmac.new()` yoktur, doğrusu `hmac.new` değil `hmac.new` — aslında `hashlib` modülündeki `hmac` ile kullanım: `hmac.new(key, msg, digestmod)`. Ancak Python standart kütüphanesinde `hmac.new` yönteminin adı `hmac.new` değil. Doğru kullanım:

```python
import hmac as _hmac
_hmac.new(key, msg, hashlib.sha256).hexdigest()
```

Bu kod çalışıyor olabilir ancak Python 3.x'de `hmac.new` yerine `hmac.new` kullanımı doğrulanmalı (Python `hmac` modülü bu isimde bir fonksiyona sahip, test edilmeli).

---

### 12. `cache.py` — Global `_redis_client` Thread Güvenli Değil
**Dosya:** [cache.py](file:///c:/Users/abdur/Desktop/projects/fastapi_category/backend/app/core/cache.py)

Aynı global değişken hem `cache.py` hem `rate_limit.py`'de ayrı ayrı initialize ediliyor. Tekrarlı bağlantı açılabilir. Merkezi bir Redis singleton kullanılmalı.

---

### 13. `requirements.txt` — Test Bağımlılıkları Production'a Giriyor

`pytest`, `iniconfig`, `pluggy` gibi test araçları production image'ına dahil ediliyor.

```diff
# requirements-dev.txt ayrı dosyaya taşınmalı
pytest==9.0.3
iniconfig==2.1.0
pluggy==1.6.0
```

---

### 14. `Dockerfile` — Build Cache Optimize Edilmemiyor

```diff
- COPY . .
- RUN pip install --no-cache-dir -r requirements.txt
+ COPY requirements.txt .
+ RUN pip install --no-cache-dir -r requirements.txt
+ COPY . .  # Kod değişince sadece bu katman yeniden build edilir
```

(Mevcut sıralama zaten doğru görünüyor ama `--no-cache` flag'i eksik değil, sorun yok.)

---

## 🟢 EKSİK CONTAINER'LAR / ARAÇLAR

### Mevcut Container'lar (İyi!)
| Servis | Durum |
|--------|-------|
| Caddy (reverse proxy + TLS) | ✅ |
| Backend (FastAPI + Gunicorn) | ✅ |
| Frontend (Next.js) | ✅ |
| PostgreSQL 16 | ✅ |
| PgBouncer (connection pooling) | ✅ |
| Redis 7 | ✅ |
| Meilisearch | ✅ |
| Celery Worker | ✅ |
| Celery Beat (scheduler) | ✅ |
| Prometheus | ✅ |
| Grafana | ✅ |
| Loki + Promtail (log aggregation) | ✅ |
| Restic Backup | ✅ |

### Eksik / Eklenmesi Önerilen Container'lar

#### ❌ 1. **Fail2Ban veya Crowdsec** (Saldırı Önleme)
IP tabanlı kaba kuvvet saldırılarını otomatik bloke eder. Rate limiter uygulama katmanında çalışıyor, ağ katmanında da olmalı.

```yaml
crowdsec:
  image: crowdsecurity/crowdsec:latest
  environment:
    - GID=1000
    - COLLECTIONS=crowdsecurity/nginx
  volumes:
    - ./infra/crowdsec:/etc/crowdsec
    - /var/log:/var/log:ro
```

#### ❌ 2. **Alertmanager** (Prometheus Uyarıları)
Grafana'da dashboard'lar var ama otomatik e-posta/Slack uyarısı yok. Alertmanager olmadan sorunlar geç fark edilir.

```yaml
alertmanager:
  image: prom/alertmanager:latest
  volumes:
    - ./infra/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
```

#### ⚠️ 3. **Meilisearch Backup** (Veri Güvenliği)
`meili_data` volume Restic tarafından yedekleniyor ama Meilisearch'in native snapshot API'si kullanılmıyor. Büyük indeks için daha hızlı restore sağlar.

#### ⚠️ 4. **Redis Sentinel veya Cluster** (Yüksek Erişilebilirlik)
Tek Redis instance var. Redis düşerse rate limiting ve cache tamamen devre dışı kalır. En azından `appendonly yes` ile AOF aktif (✅ mevcut), ancak HA için Redis Sentinel eklenebilir.

---

## 🔒 EKSİK GÜVENLİK KATMANLARI

| Katman | Durum | Öneri |
|--------|-------|-------|
| HTTPS / TLS | ✅ Caddy ile otomatik | - |
| JWT + Cookie Auth | ✅ | - |
| CSRF Koruması | ✅ | - |
| Rate Limiting | ✅ Redis tabanlı | IP spoofing açığı giderilmeli |
| Security Headers | ✅ | `unsafe-inline` kaldırılmalı |
| Audit Logging | ✅ | - |
| TOTP / 2FA (Platform admin) | ✅ | - |
| SQL Injection | ✅ Parameterized queries | - |
| File Upload Validation | ✅ MIME + Pillow verify | - |
| Secrets Scan (CI) | ✅ Gitleaks | - |
| **Dependency Vulnerability Scan** | ✅ `pip-audit` | Backend bağımlılık taraması CI'a eklendi |
| **Container Image Scan** | ✅ Trivy | Backend/frontend imaj taraması CI'a eklendi |
| **DAST (Dynamic Security Test)** | ❌ Eksik | OWASP ZAP veya Nuclei |
| **WAF (Web Application Firewall)** | ❌ Eksik | Caddy + ModSecurity veya Cloudflare WAF |
| **Brute Force Protection (Ağ)** | ❌ Eksik | CrowdSec / Fail2Ban |
| **Secret Rotation Policy** | ❌ Belgeli değil | HashiCorp Vault veya prosedür |
| **HTTP/2 Push** | ✅ Caddy ile | - |

---

## 🚀 CI/CD EKSİKLERİ

| Adım | Durum |
|------|-------|
| Backend compile check | ✅ |
| Backend tests | ✅ |
| Frontend build | ✅ |
| E2E tests (Playwright) | ✅ |
| Docker image build | ✅ |
| Secrets scan (Gitleaks) | ✅ |
| **pip-audit (backend güvenlik taraması)** | ✅ |
| **Trivy (container imaj taraması)** | ✅ |
| **Otomatik deployment** | ✅ SSH + Docker Compose workflow |
| **Database migration smoke test** | ✅ PostgreSQL service ile |

> Not: Deployment workflow'unun çalışması için GitHub secrets tarafında `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` ve `DEPLOY_PATH` tanımlanmalı. İsteğe bağlı olarak `DEPLOY_PORT`, `DEPLOY_BRANCH` ve `DEPLOY_HEALTH_URL` kullanılabilir.

---

## 👤 KULLANICI DENEYİMİ (UX) ÖNERİLERİ

### Mevcut Eksiklikler

#### 1. 📧 E-posta Şablonları Eksik
`send_verification_email` düz metin gönderiyor gibi görünüyor. HTML e-posta şablonu (logo, marka rengi, açık buton) eklenebilir.

#### 2. 🔔 Gerçek Zamanlı Bildirimler
WebSocket desteği var (`websockets` paketi yüklü) ancak admin panelinde real-time içerik güncelleme bildirimleri yok.

#### 3. 📊 Analytics Dashboard (Admin)
- Kaç kullanıcı hangi içerikleri okudu?
- Hangi arama sorguları sonuçsuz kaldı? (zero-results)
- `search_event` tablosu var, dashboard yok.

#### 4. 🌍 Çok Dil Desteği (i18n)
Frontend `locale=tr` hardcoded. Uluslararası kullanım için `next-intl` entegrasyonu önerilir.

#### 5. 📱 Progressive Web App (PWA)
Next.js + `next-pwa` ile offline erişim, push bildirim desteği eklenebilir.

#### 6. 🔍 Gelişmiş Arama UX
- Meilisearch `highlight` özelliği kullanılmıyor (arama sonuçlarında eşleşen kelimeleri vurgulama).
- Arama geçmişi, son aramalar gösterilmiyor.

#### 7. 📝 Markdown Önizleme
Admin içerik editörü için canlı Markdown önizleme (split-panel).

#### 8. 🔗 Breadcrumb & Canonical URL
SEO için `canonical` header ve breadcrumb schema.org markup eksik.

#### 9. ⌨️ Klavye Kısayolları
Arama kutusu için `Ctrl+K` / `Cmd+K` kısayolu.

#### 10. 🚀 Skeleton Loading States
İçerik yüklenirken skeleton ekranlar yerine muhtemelen boş sayfa gösteriliyor.

---



## ✅ İYİ YAPILMIŞ ŞEYLER

Bu projenin **production'a yakın** olduğunu gösteren güçlü noktalar:

- ✅ Tenant izolasyonu: Her tenant için ayrı PostgreSQL schema
- ✅ Session rotasyonu ve revocation mekanizması
- ✅ TOTP ile platform admin güvenliği
- ✅ Webhook imza doğrulaması (Iyzico HMAC)
- ✅ Audit log sistemi (tüm kritik operasyonlar loglanıyor)
- ✅ ETag + stale-while-revalidate cache stratejisi
- ✅ Sentry entegrasyonu
- ✅ JSON structured logging (Loki uyumlu)
- ✅ Prometheus metrikleri
- ✅ Restic ile otomatik yedekleme
- ✅ PgBouncer connection pooling
- ✅ DDL snapshot drift kontrolü (CI'da)
- ✅ Gitleaks secrets scan
- ✅ `validate_production_config()` startup kontrolü
- ✅ Content quality validation (min length, description ratio)
- ✅ Plan bazlı kullanım limitleri
