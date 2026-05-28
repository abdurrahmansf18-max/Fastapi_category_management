# Secret Rotation Runbook

Bu döküman, production ortamındaki tüm gizli anahtarların (secret) düzenli rotasyonu için prosedürleri tanımlar.

---

## Genel Prensipler

- Rotasyon öncesi mevcut secret'ı mutlaka yedekle
- Sıfıra indirgemeli değil — kademeli geçiş (eski key geçici olarak çalışmaya devam eder)
- Her rotasyonu audit log olarak kaydet
- Rotasyon sonrası servis health check'i doğrula
- SECRET_KEY dışındaki rotasyonlar sıfır-downtime ile yapılabilir

---

## Rotasyon Takvimi

| Secret | Önerilen Sıklık | Son Rotasyon | Kritiklik |
|--------|----------------|--------------|-----------|
| `SECRET_KEY` | 6 ayda bir | — | Kritik |
| `POSTGRES_PASSWORD` | 3 ayda bir | — | Kritik |
| `MEILISEARCH_API_KEY` | 6 ayda bir | — | Yüksek |
| `SMTP_PASSWORD` | 6 ayda bir | — | Orta |
| `RESTIC_PASSWORD` | Yılda bir | — | Kritik |
| `AWS_ACCESS_KEY_ID/SECRET` | 3 ayda bir | — | Yüksek |
| `GRAFANA_ADMIN_PASSWORD` | 3 ayda bir | — | Orta |
| `PLATFORM_OWNER_TOTP_SECRET` | Yalnızca tehdit sonrası | — | Kritik |
| `CROWDSEC_BOUNCER_API_KEY` | 6 ayda bir | — | Orta |
| `SENTRY_DSN` | Yılda bir | — | Düşük |

---

## 1. SECRET_KEY (JWT İmzalama Anahtarı)

**Etki:** Tüm aktif kullanıcı oturumları geçersiz olur. Kullanıcılar yeniden giriş yapmak zorunda kalır.

### Prosedür

```bash
# 1. Yeni key üret
python -c "import secrets; print(secrets.token_hex(32))"

# 2. .env dosyasını güncelle (sunucu üzerinde)
cd $DEPLOY_PATH
cp .env .env.backup.$(date +%Y%m%d)
nano .env  # SECRET_KEY değerini güncelle

# 3. Backend servisini yeniden başlat
docker compose -f docker-compose.prod.yml restart backend worker beat

# 4. Sağlık kontrolü
curl -fs https://$APP_DOMAIN/api/healthz | python -m json.tool

# 5. Tüm aktif oturumların geçersiz olduğunu doğrula (opsiyonel)
# Mevcut bir token ile /api/me endpoint'ine istek gönder — 401 dönmeli
```

### Rollback

```bash
cp .env.backup.$(date +%Y%m%d) .env
docker compose -f docker-compose.prod.yml restart backend worker beat
```

---

## 2. POSTGRES_PASSWORD

**Etki:** Sıfır downtime ile yapılabilir. Yeni şifre ayarlandıktan sonra .env güncellenir.

### Prosedür

```bash
# 1. Yeni şifre üret
NEW_PASS=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
echo "Yeni şifre: $NEW_PASS"  # Güvenli bir yere not et

# 2. PostgreSQL içinde şifreyi değiştir (downtime yok)
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -c "ALTER USER postgres PASSWORD '$NEW_PASS';"

# 3. .env dosyasını güncelle
cd $DEPLOY_PATH
cp .env .env.backup.$(date +%Y%m%d)
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PASS/" .env

# 4. Bağlantı havuzunu ve backend'i yeniden başlat
docker compose -f docker-compose.prod.yml restart pgbouncer backend worker beat migrate

# 5. Doğrula
docker compose -f docker-compose.prod.yml exec backend \
  python -c "import asyncio; from app.db.session import engine; asyncio.run(engine.connect())"
```

---

## 3. MEILISEARCH_API_KEY

**Etki:** Kısa süreli arama kesintisi. Master key değişirse tüm API key'ler geçersiz olur.

### Prosedür

```bash
# 1. Yeni master key üret
NEW_MEILI_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

# 2. Yeni key ile Meilisearch'i yeniden başlat
# .env'yi güncelle
sed -i "s/^MEILISEARCH_API_KEY=.*/MEILISEARCH_API_KEY=$NEW_MEILI_KEY/" .env

# 3. Meilisearch'i yeniden başlat
docker compose -f docker-compose.prod.yml restart meilisearch

# 4. Backend ve worker'ı da yeniden başlat (yeni key ile bağlansınlar)
docker compose -f docker-compose.prod.yml restart backend worker beat

# 5. Meilisearch health kontrolü
curl -H "Authorization: Bearer $NEW_MEILI_KEY" \
  http://localhost:7700/health
```

---

## 4. SMTP_PASSWORD

**Etki:** Yok. E-posta gönderimi anlık kesintiye uğrayabilir.

### Prosedür

```bash
# 1. SMTP sağlayıcısı panelinden (Resend, SendGrid vb.) yeni API key oluştur
# 2. .env güncelle
sed -i "s/^SMTP_PASSWORD=.*/SMTP_PASSWORD=yeni-smtp-sifresi/" .env

# 3. Backend'i yeniden başlat
docker compose -f docker-compose.prod.yml restart backend

# 4. Test e-postası gönder (opsiyonel — admin panelinden test)
```

---

## 5. RESTIC_PASSWORD (Yedek Şifreleme Anahtarı)

**Etki:** YÜKSEK RİSK — Eski şifreyle şifrelenmiş yedekler artık eski şifreyle restore edilebilir.
Restic, bir repository'nin şifresini değiştirmenize izin verir ancak mevcut yedekler eski şifreyle oluşturulmuştur.

### Prosedür

```bash
# 1. Önce mevcut tüm yedeklerin restore edilebilir olduğunu doğrula
docker compose -f docker-compose.prod.yml run --rm restore-check

# 2. Restic şifresini değiştir
docker run --rm \
  -e RESTIC_REPOSITORY=$RESTIC_REPOSITORY \
  -e RESTIC_PASSWORD=$RESTIC_PASSWORD \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  restic/restic key passwd
  # Yeni şifreyi iki kez gir

# 3. .env dosyasını güncelle
sed -i "s/^RESTIC_PASSWORD=.*/RESTIC_PASSWORD=yeni-restic-sifresi/" .env

# 4. Backup servisini yeniden başlat
docker compose -f docker-compose.prod.yml restart backup

# 5. Test yedeği al ve doğrula
docker compose -f docker-compose.prod.yml run --rm restore-check
```

---

## 6. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (R2/S3 Yedek Erişimi)

**Etki:** Yedekleme geçici olarak durur.

### Prosedür

```bash
# 1. Cloudflare R2 veya AWS konsolu üzerinden yeni access key oluştur
# 2. ESKİ key'i hemen silme — önce yeni key'in çalıştığını doğrula

# 3. .env güncelle
sed -i "s/^AWS_ACCESS_KEY_ID=.*/AWS_ACCESS_KEY_ID=yeni-key-id/" .env
sed -i "s/^AWS_SECRET_ACCESS_KEY=.*/AWS_SECRET_ACCESS_KEY=yeni-secret/" .env

# 4. Bağlantıyı test et
docker run --rm \
  -e RESTIC_REPOSITORY=$RESTIC_REPOSITORY \
  -e RESTIC_PASSWORD=$RESTIC_PASSWORD \
  -e AWS_ACCESS_KEY_ID=yeni-key-id \
  -e AWS_SECRET_ACCESS_KEY=yeni-secret \
  restic/restic snapshots

# 5. Test başarılıysa backup servisini yeniden başlat
docker compose -f docker-compose.prod.yml restart backup

# 6. Eski key'i sil (konsol üzerinden)
```

---

## 7. GRAFANA_ADMIN_PASSWORD

**Etki:** Yok. Grafana oturumları geçersiz olur.

### Prosedür

```bash
# Grafana API üzerinden şifreyi değiştir (container yeniden başlatma gerekmez)
curl -X PUT -H "Content-Type: application/json" \
  -d '{"oldPassword":"eski-sifre","newPassword":"yeni-sifre","confirmNew":"yeni-sifre"}' \
  http://admin:eski-sifre@localhost:3001/api/user/password

# .env'yi güncelle (gelecekteki container yeniden başlatmalar için)
sed -i "s/^GRAFANA_ADMIN_PASSWORD=.*/GRAFANA_ADMIN_PASSWORD=yeni-sifre/" .env
```

---

## 8. PLATFORM_OWNER_TOTP_SECRET

**Etki:** Mevcut TOTP kodları geçersiz olur. Platform owner yeniden authenticator uygulamasını kaydetmeli.

> Bu prosedür yalnızca güvenlik ihlali şüphesi durumunda uygulanır.

### Prosedür

```bash
# 1. Yeni TOTP secret üret
python -c "import pyotp, base64, os; print(base64.b32encode(os.urandom(20)).decode())"

# 2. Yeni secret'ı QR koda dönüştür (authenticator uygulaması için)
python -c "
import pyotp
secret = 'YENI-SECRET-BURAYA'
totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
    name='owner@example.com',
    issuer_name='Docs Platform'
)
print(totp_uri)
"
# Çıktıyı QR kod oluşturucuya ver: qr.io veya terminal: qrencode -t UTF8 '<uri>'

# 3. Authenticator uygulamasında yeni secret'ı kaydet ve test et
# Geçerli TOTP kodunu doğrula:
python -c "import pyotp; print(pyotp.TOTP('YENI-SECRET').now())"

# 4. .env güncelle
sed -i "s/^PLATFORM_OWNER_TOTP_SECRET=.*/PLATFORM_OWNER_TOTP_SECRET=YENI-SECRET/" .env

# 5. Backend yeniden başlat
docker compose -f docker-compose.prod.yml restart backend
```

---

## 9. CROWDSEC_BOUNCER_API_KEY

**Etki:** Kısa süre CrowdSec koruması devre dışı kalır.

### Prosedür

```bash
# 1. Yeni bouncer key oluştur
docker compose -f docker-compose.prod.yml exec crowdsec \
  cscli bouncers add caddy-bouncer-$(date +%Y%m%d) -o raw

# Çıktı: <YENİ-API-KEY>

# 2. .env güncelle
sed -i "s/^CROWDSEC_BOUNCER_API_KEY=.*/CROWDSEC_BOUNCER_API_KEY=<YENİ-API-KEY>/" .env

# 3. Caddy yeniden başlat (yeni key ile bağlansın)
docker compose -f docker-compose.prod.yml restart caddy

# 4. Eski bouncer'ı sil
docker compose -f docker-compose.prod.yml exec crowdsec \
  cscli bouncers delete caddy-bouncer

# 5. Doğrula
docker compose -f docker-compose.prod.yml exec crowdsec \
  cscli bouncers list
```

---

## Rotasyon Sonrası Kontrol Listesi

Her rotasyon sonrası aşağıdakileri doğrula:

```bash
# 1. Tüm servisler sağlıklı mı?
docker compose -f docker-compose.prod.yml ps

# 2. Backend health check
curl -fs https://$APP_DOMAIN/api/healthz | python -m json.tool

# 3. Frontend erişilebilir mi?
curl -fs -o /dev/null -w "%{http_code}" https://$APP_DOMAIN

# 4. Son 50 backend log satırı
docker compose -f docker-compose.prod.yml logs --tail=50 backend

# 5. Hata var mı?
docker compose -f docker-compose.prod.yml logs --since=5m | grep -i "error\|exception\|fatal"
```

---

## Acil Durum İletişim Planı

| Senaryo | Aksiyon |
|---------|---------|
| SECRET_KEY sızdı | Hemen rotasyon yap, tüm oturumlar geçersiz olur, kullanıcılara bildir |
| POSTGRES_PASSWORD sızdı | Hemen rotasyon yap, erişim loglarını incele |
| Restic yedek repository açığa çıktı | Repository'yi migrate et, yeni lokasyon oluştur |
| AWS key sızdı | AWS konsolundan key'i derhal devre dışı bırak, sonra rotasyon yap |
| TOTP secret sızdı | Hemen rotasyon yap, admin hesabı için IP kısıtlaması ekle |
