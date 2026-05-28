# Project Structure

Bu dosya projeyi okurken hangi klasörün ne işe yaradığını hızlıca görmek için
eklendi. Kodun çalışma şeklini değiştirmez.

## Ana Klasörler

- `backend/`: FastAPI uygulaması. İlk okunacak dosya `backend/main.py`.
- `frontend/`: Next.js uygulaması. Public docs, login/signup ve admin ekranları burada.
- `infra/`: Production ve operasyon dosyaları. İlk turda okumak şart değil.
- `tests/`: k6 gibi servisler arası smoke/load testleri.
- `backend/tests/`: backend unit testleri. Davranışı anlamak için çok değerli.
- `frontend/tests/`: Playwright e2e testleri.
- `.github/`: CI, deploy ve güvenlik otomasyonu.
- `docs/`: proje notları, raporlar ve okuma rehberleri.
- `scripts/`: lokal yardımcı komutlar.

## VS Code Görünümü

Repo içindeki bazı dosyalar araçların beklediği yerde durmak zorunda olduğu için
fiziksel olarak taşınmadı. Bunun yerine `.vscode/settings.json` içinde file
nesting açıldı. Böylece örneğin:

- `requirements-dev.txt`, `requirements.txt` altında görünür.
- `.dockerignore`, `Dockerfile` altında görünür.
- `docker-compose.dev.yml`, `docker-compose.prod.yml` altında görünür.
- `DDL.sql`, `alembic.ini` altında görünür.

Bu sadece editör görünümünü değiştirir; Docker, Alembic, FastAPI ve CI
komutlarını bozmaz.

## İlk Okuma Rotası

1. `backend/main.py`
2. `backend/app/core/config.py`
3. `backend/app/core/tenancy.py`
4. `backend/app/db/session.py`
5. `backend/app/db/models.py`
6. `backend/app/routers/auth.py`
7. `backend/app/routers/public.py`
8. `backend/app/routers/admin.py`
9. `frontend/src/shared/api/client.ts`
10. `frontend/app/d/[tenantSlug]/page.tsx`
11. `frontend/src/admin/AdminApp.tsx`

## İlk Turda Atlanabilecekler

- `.pytest_cache/`
- `**/__pycache__/`
- `frontend/test-results/`
- `frontend/.next-dev*.log`
- `frontend/tsconfig.tsbuildinfo`
- `backend/celerybeat-schedule`

Bunlar kodu anlamak için gerekli değildir. Bazıları git tarafından takip ediliyor
olabilir; takip edilen dosyalar ayrıca karar verilmeden silinmemelidir.

## Silinmemesi Gerekenler

- `tests/`
- `backend/tests/`
- `frontend/tests/`
- `.github/`
- `docker-compose.*.yml`
- `infra/`

Bu klasörler ilk bakışta kalabalık görünür ama projenin test, deploy veya
operasyon akışlarının parçasıdır.

## Güvenli Temizlik

Geçici dosyaları temizlemek için:

```powershell
.\scripts\clean-dev-artifacts.ps1
```

Bu script uygulama kaynak kodunu, test dosyalarını, Docker dosyalarını veya
GitHub workflow dosyalarını silmez.
