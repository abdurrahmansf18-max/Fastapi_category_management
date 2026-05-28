# Dikey İlerleme ile Projeyi Okuma Rehberi

Bu rehberin amacı projeyi dosya dosya ezberlemek değil; gerçek bir kullanıcı
akışını seçip o akışın frontend'den backend'e, oradan veritabanına ve testlere
kadar nasıl ilerlediğini takip etmeyi öğretmektir.

Bu yönteme burada **dikey ilerleme** diyeceğiz.

## 1. Dikey İlerleme Nedir?

Normalde büyük projelerde insan şuna düşer:

- Önce bütün klasörleri anlamaya çalışır.
- Sonra bütün dosyaları sırayla okumaya çalışır.
- Sonra yorulur, çünkü parçalar birbirine bağlanmaz.

Dikey ilerleme bunun yerine şunu yapar:

1. Küçük bir kullanıcı davranışı seç.
2. O davranışın ekranda nerede başladığını bul.
3. Hangi API fonksiyonuna gittiğini takip et.
4. Backend endpoint'ini bul.
5. Backend'in hangi servis, helper, schema ve DB kodunu kullandığını incele.
6. Bu davranış için hangi testlerin yazıldığını bul.
7. Akışı kendi cümlelerinle baştan sona özetle.

Yani projeyi yatay katmanlar halinde değil, çalışan bir özellik üzerinden
okursun.

## 2. Bu Projede Ana Katmanlar

Bu projede dikey akışlar genelde şu katmanlardan geçer:

```text
Next.js page/component
  -> frontend/src/shared/api/*.ts
  -> frontend/src/shared/api/client.ts
  -> backend/main.py router bağlantısı
  -> backend/app/routers/*.py
  -> backend/app/core/*.py helper'ları
  -> backend/app/db/session.py
  -> backend/app/db/models.py veya SQL query
  -> backend/tests veya frontend/tests
```

Önemli fikir: `frontend/src/shared/api/client.ts` bu projenin frontend tarafında
çok merkezi bir dosyasıdır. Admin ve public isteklerde tenant slug'ını URL'ye
ekleme işinin önemli kısmı burada yapılır.

Örnek:

```ts
// frontend/src/shared/api/client.ts
const slug = getTenantSlug();
return slug ? `/t/${encodeURIComponent(slug)}${path}` : path;
```

Bu şunu anlatır: Admin panelindeyken frontend `/admin/contents` der, client
bunu arka planda `/t/demo/admin/contents` haline getirir.

## 3. Her Akış İçin Kullanacağın Okuma Şablonu

Her dikey akışta aynı şablonu kullan:

```text
Akış adı:
Kullanıcı ne yapıyor?
Frontend başlangıç dosyası:
API client fonksiyonu:
Backend endpoint:
Backend hangi kuralları kontrol ediyor?
Veritabanında hangi tablo(lar) etkileniyor?
Cache, session, mail, queue gibi yan etkiler var mı?
Bu akışı test eden dosya var mı?
Ben bu akışı tek paragrafta nasıl açıklarım?
```

Bu şablon küçük görünüyor ama çok güçlü. Çünkü seni rastgele okumaktan
kurtarır.

## 4. Akış 1: Workspace Oluşturma / Signup

Bu akış yeni bir workspace oluşturmayı anlatır.

### Kullanıcı Davranışı

Kullanıcı `/signup` sayfasında workspace adı, slug, email ve şifre girer.

### Okuma Rotası

1. `frontend/app/signup/page.tsx`
2. `frontend/src/shared/api/auth.ts`
3. `frontend/src/shared/api/client.ts`
4. `backend/main.py`
5. `backend/app/routers/auth.py`
6. `backend/app/db/provisioning.py`
7. `backend/app/db/session.py`
8. `backend/app/core/email.py`
9. `backend/app/core/rate_limit.py`
10. `backend/app/core/audit.py`

### Frontend'de Ne Oluyor?

`frontend/app/signup/page.tsx` içinde form submit edildiğinde şu API çağrısı
yapılır:

```ts
PlatformAuthApi.signup({
  email,
  password,
  workspace_name: workspaceName,
  tenant_slug: effectiveSlug,
});
```

Bu fonksiyon `frontend/src/shared/api/auth.ts` içinde tanımlıdır:

```ts
signup(payload: SignupPayload) {
  return http.post<SignupResponse>("/auth/signup", payload, { auth: false });
}
```

Buradaki önemli nokta: `/auth/signup` tenant'a bağlı değildir. Çünkü kullanıcı
henüz bir tenant içinde değildir.

### Backend'de Ne Oluyor?

`backend/main.py` içinde `auth_router` uygulamaya bağlanır:

```py
app.include_router(auth_router)
```

Asıl endpoint `backend/app/routers/auth.py` içindedir:

```py
@auth_router.post("/signup", response_model=SignupOut, status_code=201)
async def signup(payload: SignupIn, request: Request):
```

Bu fonksiyon şunları yapar:

- Signup için rate limit uygular.
- Workspace slug'ından tenant schema adını üretir.
- Şifreyi hash'ler.
- Email verification token üretir.
- `public.user_account` tablosuna kullanıcı ekler.
- `public.tenant` tablosuna tenant ekler.
- `public.email_verification_token` tablosuna doğrulama token'ı ekler.
- Email göndermeyi dener.
- Audit event yazar.

Burada öğrenmen gereken ana kavramlar:

- **Rate limit**: `enforce_rate_limit`
- **Password hashing**: `pwd_context.hash`
- **Tenant mantığı**: `schema_name_for_slug`
- **Audit log**: `log_audit_event`
- **Email verification**: `send_verification_email`

### Kendine Sor

- Signup neden `/t/{tenant_slug}` altında değil?
- Kullanıcı oluşturulunca tenant schema hemen oluşuyor mu, yoksa email verify sonrası mı?
- Email gönderilemezse signup tamamen başarısız mı oluyor?
- Aynı email veya slug tekrar kullanılırsa hangi HTTP status dönüyor?

### Mini Alıştırma

`backend/app/routers/auth.py` içinde signup fonksiyonunu oku ve şu özeti yaz:

```text
Signup endpoint'i önce ..., sonra ..., en sonunda ...
```

Bu özeti 5 cümleyi geçmeden yazmaya çalış.

## 5. Akış 2: Login ve Workspace Seçimi

Bu akış kullanıcının merkezi login ile giriş yapıp hangi workspace'e gireceğini
seçmesini anlatır.

### Kullanıcı Davranışı

Kullanıcı `/login` sayfasına email ve şifre girer. Eğer birden fazla workspace
varsa bir workspace seçer.

### Okuma Rotası

1. `frontend/app/login/page.tsx`
2. `frontend/src/shared/api/auth.ts`
3. `backend/app/routers/auth.py`
4. `backend/app/core/security.py`
5. `backend/app/core/sessions.py`
6. `backend/app/core/csrf.py`
7. `frontend/src/shared/api/client.ts`

### Frontend'de Ne Oluyor?

`frontend/app/login/page.tsx` içinde login submit edildiğinde:

```ts
const response = await PlatformAuthApi.login(email, password);
```

Sonra workspace seçimi için:

```ts
await PlatformAuthApi.selectWorkspace(selectionToken, selectedSlug);
```

`frontend/src/shared/api/auth.ts` içinde bunlar şu endpoint'lere gider:

```ts
login(email, password) {
  return http.post<CentralLoginResponse>("/auth/login", { email, password }, { auth: false });
}

selectWorkspace(selectionToken: string, tenantSlug: string) {
  return http.post<WorkspaceSelectResponse>(
    "/auth/select-workspace",
    { selection_token: selectionToken, tenant_slug: tenantSlug },
    { auth: false }
  );
}
```

### Backend'de Ne Oluyor?

`backend/app/routers/auth.py` içinde iki kritik endpoint vardır:

```py
@auth_router.post("/login", response_model=AuthLoginOut)
async def auth_login(payload: AuthLoginIn, request: Request):
```

ve:

```py
@auth_router.post("/select-workspace", response_model=WorkspaceSelectOut)
async def select_workspace(payload: WorkspaceSelectIn, request: Request, response: Response):
```

Login endpoint'i kullanıcıyı doğrular ve workspace listesini döner.
Workspace seçimi endpoint'i ise seçilen tenant için session/cookie hazırlar.

Burada özellikle şu dosyaları incele:

- `backend/app/core/sessions.py`: session ve refresh token mantığı.
- `backend/app/core/csrf.py`: admin cookie ve CSRF token adları.
- `backend/app/core/security.py`: JWT ve current admin kontrolü.

### Kendine Sor

- Login neden doğrudan admin paneline token vermiyor?
- `selection_token` neden ayrı bir geçici token?
- Cookie isimleri tenant slug'a göre nasıl ayrılıyor?
- CSRF token hangi HTTP method'larda ekleniyor?

### Mini Alıştırma

`frontend/src/shared/api/client.ts` içinde `csrfToken`, `buildHeaders` ve
`scopedPath` fonksiyonlarını oku. Sonra şu cümleyi tamamla:

```text
Bu client, admin isteği atarken tenant slug'ını ... üzerinden bulur ve URL'yi ...
haline getirir. POST/PUT/PATCH/DELETE isteklerinde CSRF token'ı ...
```

## 6. Akış 3: Public Docs Sayfasını Açma

Bu akış ziyaretçinin `/d/{tenantSlug}` altında public dokümantasyon sayfasını
açmasını anlatır.

### Kullanıcı Davranışı

Ziyaretçi `/d/demo` gibi bir URL açar ve tenant'a ait public dokümanları görür.

### Okuma Rotası

1. `frontend/app/d/[tenantSlug]/page.tsx`
2. `frontend/app/lib/api.ts`
3. `frontend/app/d/[tenantSlug]/PublicHeader.tsx`
4. `frontend/app/d/[tenantSlug]/PublicDocsLayout.tsx`
5. `backend/app/routers/public.py`
6. `backend/app/core/tenancy.py`
7. `backend/app/core/cache.py`
8. `backend/app/db/session.py`

### Frontend'de Ne Oluyor?

Next.js route yapısında `[tenantSlug]` dinamik segmenttir. Örneğin:

```text
/d/demo
```

şu dosyaya düşer:

```text
frontend/app/d/[tenantSlug]/page.tsx
```

Server-side fetch için `frontend/app/lib/api.ts` kullanılır. Bu dosyada backend
base URL'i belirlenir:

```ts
export const apiBase =
  process.env.NEXT_INTERNAL_API_BASE ||
  process.env.NEXT_BACKEND_ORIGIN ||
  "http://localhost:8000";
```

Bu public sayfalarda sık görülen endpoint:

```text
GET /t/{tenantSlug}/docs-index
```

### Backend'de Ne Oluyor?

`backend/app/routers/public.py` içindeki router tenant prefix ile başlar:

```py
public_router = APIRouter(
    prefix="/t/{tenant_slug}",
    tags=["public"],
    dependencies=[Depends(require_tenant_context)],
)
```

Bu çok önemli: Public endpoint'lere gelen her istek önce tenant context yükler.

`docs_index` endpoint'i:

```py
@public_router.get("/docs-index", response_model=List[dict])
async def docs_index():
```

Bu endpoint şunları yapar:

- Aktif tenant'ı `get_tenant_context()` ile alır.
- Cache key üretir.
- Cache varsa doğrudan döner.
- Yoksa category, h1, h2 ve published content ilişkisini SQL ile toplar.
- Sonucu frontend'in sidebar/menu yapısına uygun nested hale getirir.
- Sonucu cache'e yazar.

### Kendine Sor

- Public endpoint'ler neden `require_tenant_context` dependency'si kullanıyor?
- `docs-index` neden sadece published içerikleri getiriyor?
- Cache key neden tenant id ile başlıyor?
- Backend sonucu neden direkt SQL row listesi olarak değil, nested yapı olarak döndürüyor?

### Mini Alıştırma

`backend/app/routers/public.py` içinde `docs_index` fonksiyonunu oku ve şu
veri dönüşümünü çiz:

```text
SQL row'ları
  -> category sözlüğü
  -> heading sözlüğü
  -> children listesi
  -> frontend'e dönen docs index
```

## 7. Akış 4: Admin Panelde İçerik Oluşturma

Bu akış admin panelinden yeni bir içerik oluşturmayı anlatır. Bu proje için en
öğretici akışlardan biridir; çünkü frontend state, API client, tenant URL,
auth, validation, DB insert ve cache invalidation aynı yerde birleşir.

### Kullanıcı Davranışı

Admin `/d/{tenantSlug}/admin` ekranında bir heading seçer ve ona içerik ekler.

### Okuma Rotası

1. `frontend/app/d/[tenantSlug]/admin/[[...path]]/page.tsx`
2. `frontend/app/d/[tenantSlug]/admin/admin-client.tsx`
3. `frontend/src/admin/AdminApp.tsx`
4. `frontend/src/admin/components/CreateContentForm.tsx`
5. `frontend/src/shared/api/admin.ts`
6. `frontend/src/shared/api/client.ts`
7. `backend/app/routers/admin.py`
8. `backend/app/core/security.py`
9. `backend/app/core/tenancy.py`
10. `backend/app/core/cache.py`
11. `backend/app/db/models.py`

### Frontend'de Ne Oluyor?

`frontend/src/admin/AdminApp.tsx` içinde `createContent` fonksiyonu bulunur.
Bu fonksiyon sonunda API çağrısı yapar:

```ts
const newContent = await ContentsApi.create({
  heading_id: headingId,
  body,
  description,
  status,
});
```

`frontend/src/shared/api/admin.ts` içinde:

```ts
export const ContentsApi = {
  create(payload: ContentCreate) {
    return http.post<Content>("/admin/contents", payload);
  },
};
```

Burada ilk bakışta URL eksik görünebilir. Çünkü `/admin/contents` içinde tenant
slug yok. Bu eksikliği `frontend/src/shared/api/client.ts` tamamlar:

```ts
const slug = getTenantSlug();
return slug ? `/t/${encodeURIComponent(slug)}${path}` : path;
```

Yani admin panelde gerçek istek şuna dönüşür:

```text
POST /api/t/demo/admin/contents
```

### Backend'de Ne Oluyor?

`backend/app/routers/admin.py` içindeki router:

```py
admin_router = APIRouter(
    prefix="/t/{tenant_slug}/admin",
    tags=["admin"],
    dependencies=[Depends(require_tenant_context)],
)
```

Content endpoint'i:

```py
@admin_router.post("/contents", response_model=ContentOut)
async def create_content(payload: ContentCreate, _=Depends(get_current_admin)):
```

Bu endpoint şunları yapar:

- Tenant limitini kontrol eder: `enforce_tenant_limit("contents")`
- İçerik kalitesini kontrol eder: `_validate_content_quality`
- Aynı heading için zaten content var mı bakar.
- Content tablosuna insert yapar.
- Public cache'i temizler: `invalidate_current_tenant_public_cache`
- Oluşturulan row'u frontend'e döner.

Bu akışta öğrenmen gereken ana mimari fikir şudur:

```text
Admin yazma işlemi
  -> authentication gerekir
  -> tenant context gerekir
  -> plan limitleri kontrol edilir
  -> veri tenant schema içinde yazılır
  -> public cache temizlenir
```

### Kendine Sor

- Aynı heading'e ikinci content eklenirse neden 409 dönüyor?
- `_validate_content_quality` neden backend'de var? Frontend validation yetmez mi?
- İçerik oluşturunca public cache neden temizleniyor?
- `fetch_one` ve `execute` tenant schema'yı nasıl biliyor?

### Mini Alıştırma

Bu akış için kendi sözlerinle şu tabloyu doldur:

| Katman | Dosya | Görevi |
| --- | --- | --- |
| UI | `CreateContentForm.tsx` | ... |
| State | `AdminApp.tsx` | ... |
| API wrapper | `admin.ts` | ... |
| HTTP client | `client.ts` | ... |
| Router | `admin.py` | ... |
| Tenant | `tenancy.py` | ... |
| DB | `session.py` / `models.py` | ... |

## 8. Akış 5: Public Search

Bu akış public dokümanlarda arama yapmayı anlatır.

### Kullanıcı Davranışı

Ziyaretçi public docs sayfasında arama kutusuna kelime yazar.

### Okuma Rotası

1. `frontend/app/d/[tenantSlug]/LiveSearchBar.tsx`
2. `frontend/app/d/[tenantSlug]/search/SearchPageClient.tsx`
3. `backend/app/routers/public.py`
4. `backend/app/core/search.py`
5. `backend/app/core/rate_limit.py`
6. `backend/app/worker.py`
7. `backend/app/routers/admin.py`

### Backend'de Ne Oluyor?

Public search endpoint'i:

```py
@public_router.get("/search", response_model=List[dict])
async def search(...):
```

Bu endpoint:

- Tenant context alır.
- Public search rate limit uygular.
- `search_tenant` fonksiyonunu çağırır.
- Arama event'ini kaydeder.

Arama index'ini yenileme ise admin tarafındadır:

```py
@admin_router.post("/search/reindex", status_code=202)
async def reindex_search(current=Depends(get_current_admin)):
```

Buradan `backend/app/worker.py` içindeki Celery task akışına geçilir.

### Kendine Sor

- Search neden public endpoint'te ama reindex neden admin endpoint'te?
- Search için neden ayrı rate limit var?
- Meilisearch yoksa fallback davranışı var mı?
- Reindex neden queue/worker üzerinden yapılmış olabilir?

## 9. Testleri Dikey Okuma

Testleri ayrı bir dünya gibi görme. Testler, akışların beklenen davranışını
anlatan belgeler gibidir.

Bu projede testler üç ana yerde:

- `backend/tests/`: backend davranış testleri.
- `frontend/tests/e2e/`: tarayıcı/e2e testleri.
- `tests/k6/`: smoke ve performans testleri.

Örneğin content, tenant, güvenlik, migration gibi konuları anlamak için önce
ilgili backend testini oku. Bir test dosyasını okurken şunu sor:

```text
Bu test hangi davranışı garanti ediyor?
Bu davranış hangi endpoint veya helper ile ilgili?
Bu davranış bozulursa kullanıcı ne yaşar?
```

Örnek:

- `backend/tests/test_migration_order.py`
  - Migration sırasını kontrol eder.
  - Önce Alembic, sonra platform migrations, sonra tenant migrations çalışmalı.

- `backend/tests/test_plan_limits.py`
  - Tenant plan limitlerini anlamak için okunmalı.

- `backend/tests/test_security_sessions.py`
  - Session, refresh token ve auth mantığı için okunmalı.

- `frontend/tests/e2e/public-docs.spec.ts`
  - Public docs UI davranışını anlamak için okunmalı.

## 10. Kod Okurken Not Alma Formatı

Her dosya için uzun not tutma. Şu kısa format yeterli:

```text
Dosya:
Bu dosyanın görevi:
Kim çağırıyor?
Kimi çağırıyor?
Girdi:
Çıktı:
Önemli yan etkiler:
Anlamadığım 1 soru:
```

Örnek:

```text
Dosya: frontend/src/shared/api/client.ts
Bu dosyanın görevi: Frontend HTTP isteklerini standartlaştırmak.
Kim çağırıyor? auth.ts, admin.ts, public.ts.
Kimi çağırıyor? fetch API.
Girdi: path, method, json, headers.
Çıktı: parse edilmiş response veya error.
Önemli yan etkiler: CSRF header ekler, tenant slug ile path scope eder.
Anlamadığım 1 soru: 403 olunca neden sadece admin URL'lerinde token temizleniyor?
```

Bu format seni aktif okuyucu yapar. Kod sana cevap verir.

## 11. Haftalık Çalışma Planı

### Gün 1: Harita Çıkarma

- `backend/main.py` oku.
- Router listesini çıkar.
- `frontend/src/shared/api/client.ts` oku.
- Tenant URL mantığını kendi sözlerinle yaz.

### Gün 2: Signup Dikey Akışı

- `frontend/app/signup/page.tsx`
- `frontend/src/shared/api/auth.ts`
- `backend/app/routers/auth.py`
- `backend/app/db/provisioning.py`

Çıktı: Signup akışını 8 adımda yaz.

### Gün 3: Login ve Session

- `frontend/app/login/page.tsx`
- `backend/app/core/sessions.py`
- `backend/app/core/csrf.py`
- `backend/app/core/security.py`

Çıktı: Cookie, CSRF ve session ilişkisini çiz.

### Gün 4: Public Docs

- `frontend/app/d/[tenantSlug]/page.tsx`
- `frontend/app/lib/api.ts`
- `backend/app/routers/public.py`
- `backend/app/core/cache.py`

Çıktı: `/d/demo` açılınca hangi backend endpoint'leri çağrılıyor yaz.

### Gün 5: Admin Content

- `frontend/src/admin/AdminApp.tsx`
- `frontend/src/shared/api/admin.ts`
- `backend/app/routers/admin.py`
- `backend/app/core/tenancy.py`

Çıktı: Content create akışını tablo halinde yaz.

### Gün 6: Testlerden Öğrenme

- `backend/tests/test_plan_limits.py`
- `backend/tests/test_security_sessions.py`
- `frontend/tests/e2e/public-docs.spec.ts`

Çıktı: Her test dosyasından öğrendiğin 3 kuralı yaz.

### Gün 7: Küçük Değişiklik Denemesi

Kodu bozmayacak küçük bir hedef seç:

- Bir hata mesajını daha anlaşılır yap.
- Bir frontend label'ı i18n içine taşı.
- Bir backend endpoint için küçük bir test ekle.
- Bir docs açıklamasını iyileştir.

Değişiklikten sonra şu soruları cevapla:

```text
Hangi akışı etkiledim?
Frontend değişti mi?
Backend değişti mi?
Test gerekiyor mu?
Cache/session/tenant etkisi var mı?
```

## 12. En Sık Yapılan Hatalar

### Hata: Dosyaları sırayla okumaya çalışmak

Çözüm: Önce akış seç. Örneğin "admin content oluşturma".

### Hata: Sadece frontend okumak

Çözüm: Her frontend API çağrısının backend endpoint'ini bul.

### Hata: Backend endpoint'i okuyup DB etkisini atlamak

Çözüm: `fetch_one`, `fetch_all`, `execute`, `platform_*` çağrılarını takip et.

### Hata: Tenant mantığını unutmak

Çözüm: Şunu akılda tut:

```text
public.* tabloları platform/genel bilgi içindir.
tenant schema içindeki tablolar workspace'e özel içerikler içindir.
```

### Hata: Testleri sona bırakmak

Çözüm: Testler kodun niyetini anlatır. Özelliği anlamak için erken oku.

## 13. Kendi Dikey Akışını Seçme Listesi

Yeni bir akış seçerken şu listeyi kullan:

- Bu akış kullanıcı ekranında nerede başlıyor?
- Form mu, buton mu, sayfa yüklenmesi mi, background job mı?
- Frontend API wrapper'ı hangisi?
- Backend router hangisi?
- Auth gerekiyor mu?
- Tenant gerekiyor mu?
- DB yazıyor mu, sadece okuyor mu?
- Cache temizliyor mu?
- Queue/worker kullanıyor mu?
- Testi var mı?

Bu soruların cevapları çıkıyorsa, o akışı çalışmaya hazırsın.

## 14. Bu Proje İçin Önerilen İlk 5 Dikey Akış

1. Signup
   - `frontend/app/signup/page.tsx`
   - `frontend/src/shared/api/auth.ts`
   - `backend/app/routers/auth.py`

2. Login ve workspace seçimi
   - `frontend/app/login/page.tsx`
   - `backend/app/core/sessions.py`
   - `backend/app/core/csrf.py`

3. Public docs index
   - `frontend/app/d/[tenantSlug]/page.tsx`
   - `backend/app/routers/public.py`
   - `backend/app/core/cache.py`

4. Admin content create
   - `frontend/src/admin/AdminApp.tsx`
   - `frontend/src/shared/api/admin.ts`
   - `backend/app/routers/admin.py`

5. Search ve reindex
   - `frontend/app/d/[tenantSlug]/LiveSearchBar.tsx`
   - `backend/app/core/search.py`
   - `backend/app/worker.py`

## 15. Bitirme Kontrolü

Bir akışı gerçekten anladığını şu şekilde test et:

```text
Bu akışı yeni başlayan birine 2 dakikada anlatabiliyor muyum?
Frontend'de hangi dosyada başladığını biliyor muyum?
Backend endpoint'ini biliyor muyum?
Tenant slug'ın nerede eklendiğini biliyor muyum?
DB'de hangi tabloya dokunduğunu biliyor muyum?
Hata durumunda hangi status döndüğünü biliyor muyum?
Bu davranışı koruyan test var mı biliyor muyum?
```

Bu soruların çoğuna cevap verebiliyorsan, artık o dikey akışa hakimsin.

## 16. Küçük Kural

Her gün sadece bir akış seç.

Bir akışı bitirmeden başka akışa geçme. Büyük projelerde gelişmenin sırrı daha
çok dosya açmak değil, açtığın dosyalar arasında anlamlı bağlantı kurmaktır.
