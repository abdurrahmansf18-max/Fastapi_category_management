

# DocSpace: SaaS Dönüşümü Görev Listesi (Master Roadmap)

Bu belge, mevcut platformu tam teşekküllü bir SaaS ürününe dönüştürmek için gereken tüm teknik görevleri, sistem mimarisini ve kullanılacak dış servisleri tek bir yerde toplayan ana kılavuzdur.

---

## 🌐 Genel Geliştirme Standartları (Her Görev İçin Zorunlu)

* **Mobil Uyum (UI/UX):** Eklenecek tüm arayüzler, butonlar, formlar ve grafikler mobil cihazlarda (responsive) kusursuz, sade ve sıkışıklık yaratmayacak şekilde tasarlanacaktır.
* **3 Dil Desteği (i18n):** Kullanıcıya gösterilecek olan her yeni metin, başlık ve etiket sistemin desteklediği 3 dile uyumlu olacaktır.
* **Hata Mesajları (Feedback):** Yapılan her işlem (başarı, başarısızlık, yetkisiz erişim, kota aşımı vb.) için kullanıcıya kendi seçtiği sistem dilinde (3 dil destekli) net hata/durum dönüş mesajları gösterilecektir.

---

## 🧮 Sistem Kapasite Yönetimi: Puan Bazlı Akıllı Algoritma (Overbooking)

**💻 Sunucu (VPS) Altyapı Bilgilerimiz:**

* **Sistem:** Oracle Cloud KVM Virtual Machine
* **İşletim Sistemi:** Ubuntu 24.04 LTS (Noble Numbat)
* **İşlemci (CPU):** ARM64 Mimarisi (Ampere A1 serisi, modern web sunucuları için çok hızlı ve verimlidir)
* **RAM (Bellek):** 24 GB System Memory (Veritabanı, Redis ve Docker konteynerleri için devasa ve çok rahat bir alan)
* **Disk Alanı:** Toplam 137 GB Block Volume (İşletim sistemi sonrası kullanıma hazır net ~126 GB EXT4 Alan)

> **Mühendis İçin Not:** Mevcut donanım gücü (24GB RAM) çok yüksek olduğu için bellek darboğazımız (Memory Bottleneck) hiç yoktur. Sistemin tek sınırı Disk Kapasitesidir (Net ~100 GB). Bu yüzden kapasite planlaması ve kayıt limitleri RAM'e göre değil, tamamen diski korumak üzerine `.env` değişkenleriyle (Puan tabanlı algoritma) yapılandırılacaktır.

Sunucunun çökmemesi ve diskin verimli kullanılması için sabit bir "Maksimum Kullanıcı Sayısı" YERİNE, aşağıdaki "Puan/Ağırlık" algoritması `.env` değişkenleriyle kodlanacaktır:

**Gereken `.env` Değişkenleri:**

```env
SYSTEM_TOTAL_CAPACITY_MB=100000     # Sunucu kapasitesi (Hostinger'a geçilirse 400000 yapılacak)
SYSTEM_SAFE_THRESHOLD_PERCENT=80    # Yeni Free kayıtlarının durdurulacağı baraj (%80)
PLAN_WEIGHT_FREE_MB=10              # 1 Free kullanıcının disk ağırlık puanı
PLAN_WEIGHT_PRO_MB=1000             # 1 Pro kullanıcının disk ağırlık puanı

```

**Karar Mekanizması (FastAPI Kayıt İşlemi):**

1. Sistem mevcut yükü hesaplar: `Current Load = (Sistemdeki Free Kullanıcı Sayısı * 10) + (Sistemdeki Pro Kullanıcı Sayısı * 1000)`
2. Kırmızı Çizgi Hesaplanır: `Safe Limit = 100000 * 0.80 = 80.000`
3. Eğer `Current Load >= Safe Limit` ise: **Dışarıdan gelecek yeni Free üyeliklere sistem kapatılır** ("Kapasite dolu" hatası verilir). Geriye bırakılan %20'lik boşluk sadece içeride olup da Para ödeyerek Pro'ya geçecek müşterilere ayrılır.

---

## 🔑 Beklenen API Anahtarları (Ortam Değişkenleri - Secrets)

Aşağıdaki servisler entegre edilecek ancak şifreleri (gerçek canlı ortam şifreleri) daha sonra `.env` dosyasına eklenecektir. Entegrasyonları bu değişken isimlerine göre yazın:

* **Iyzico (Türkiye Pazarı):** `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`
* **Stripe (Global Pazar):** `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
* **PayPal:** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
* **OpenAI (Yapay Zeka):** `OPENAI_API_KEY` (gpt-4o-mini ve text-embedding-3-small için)
* **Domain:** `CNAME_TARGET_DOMAIN` (Müşterilerin domain yönlendireceği köprü adresimiz, Örn: cname.docspace.com)

---

## ✅ Aşama 1: Zaten Tamamlanan / Çok Az İşi Kalanlar (Hızlı Kazanımlar)

### 1. Tenant Analitikleri (Public Entegrasyonu)

* `[ 1.1 ]` **Front-end (Public - Mobil Uyumlu):** Ziyaretçiler public sayfalarda gezinirken arka planda çalışan `/api/platform/analytics` endpoint'ine beacon/fetch ile veri gönderimini entegre edin.
* `[ 1.2 ]` **Hata Yönetimi & Dil:** Analitik verisi gönderilemediğinde veya ağ koptuğunda kullanıcı deneyimini bozmayacak sessiz hata kontrollerini ekleyin (3 dil uyumlu loglama).

### 2. Kotalar ve Marka Özelleştirme (Renk Entegrasyonu)

* `[ 2.1 ]` **Back-end (Database):** `site_setting` tablosuna `primary_color` (Ana Tema Rengi) anahtarını eklemek için gerekli altyapıyı hazırlayın.
* `[ 2.2 ]` **Front-end (Admin Panel - Mobil Uyumlu):** Görünüm ayarları sayfasına mobil uyumlu bir "Tema Rengi Seçici (Color Picker)" bileşeni ekleyin.
* `[ 2.3 ]` **Front-end (Public):** Sayfa yüklenirken seçilen rengi Tailwind CSS değişkenlerine (CSS Variables) dinamik olarak enjekte edin.
* `[ 2.4 ]` **Hata & Dil:** Renk kaydedilirken veya yüklenirken oluşabilecek hatalar için 3 dilde uyarı/başarı mesajları ("Renk başarıyla güncellendi", "Geçersiz renk formatı" vb.) ekleyin.

---

## 🚀 Aşama 2: Lansman İçin Kritik Eksikler (Core SaaS Features)

### 3. Özel Alan Adı Desteği (Custom Domain Routing) - 🌟 Sadece Pro Üyelere Özel

> **Mantık:** Sistem üzerinden domain satılmaz. Kullanıcı domaini kendi alır ve bizim `CNAME_TARGET_DOMAIN` adresimize yönlendirir. **Önemli Kural:** Özel alan adı bağlama özelliği sadece **Pro** plana sahip üyeler için aktiftir. **Free** plan kullanıcıları sadece sistemin sunduğu varsayılan alt alan adını (örneğin: `[docspace.com/d/sirketadi](https://docspace.com/d/sirketadi)`) kullanabilirler.

* `[ 3.1 ]` **Back-end (FastAPI & Alembic):** `public.tenant` tablosuna `custom_domain` kolonunu ekleyen veritabanı taşımasını (migration) yapın.
* `[ 3.2 ]` **Back-end (Yetki ve DNS Doğrulama):** DNS doğrulama endpoint'ine plan yetkisi kontrolü ekleyin. İstek atan kullanıcının `tenant.plan_code` değeri 'pro' değilse işlemi 3 dilde "Bu özellik sadece Pro üyeler içindir" hatasıyla reddedin. Pro üye ise CNAME kaydını kontrol edip doğrulayın.
* `[ 3.3 ]` **Front-end (Next.js Middleware):** `middleware.ts` dosyasını güncelleyin; gelen host header'ına göre istekleri ilgili tenant rotasına (`/d/[tenantSlug]`) yönlendirin (rewrite). Sadece doğrulanmış Pro hesapların özel domain yönlendirmesine izin verin.
* `[ 3.4 ]` **Altyapı (Caddy/Traefik):** Caddy üzerinde On-Demand TLS (Otomatik SSL sertifikası üretimi) ayarlarını yapılandırın.
* `[ 3.5 ]` **Mobil Arayüz, Hata & Dil (Paywall Entegrasyonu):** Domain ekleme formunu mobil uyumlu tasarlayın. Free kullanıcılar bu alana girdiğinde işlem yapmalarını engelleyip 3 dilde "Kendi alan adınızı bağlamak için Pro plana geçin" şeklinde bir yükseltme (upsell) ekranı gösterin. Pro kullanıcılar için ise yanlış/eksik DNS yönlendirmelerinde 3 dilde detaylı hata mesajı gösterin ("CNAME kaydı bulunamadı", "Domain zaten kullanımda" vb.).

### 4. Paket Kotaları, Veritabanı SEO ve Karakter Sınırları (SaaS Sınırları)

> **Not:** Sistemdeki mevcut ücretsiz plan kotaları çok yüksektir. Aşağıdaki yeni, katı SaaS kotaları ve veritabanı kısıtlamaları derhal uygulanmalıdır.

* `[ 4.1 ]` **Back-end (Kota Güncelleme - Free):** `provisioning.py` içerisindeki `public.plan` tablosunda Free plan limitlerini güncelleyin: 1 Yönetici, 5 Kategori, 50 İçerik, 10 MB Görsel Alanı, 0 AI Limiti.
* `[ 4.2 ]` **Back-end (Kota Güncelleme - Pro):** `public.plan` tablosuna silinen 'pro' paketini yeniden ekleyin: 5 Yönetici, 100 Kategori, 2000 İçerik, 1 GB Görsel Alanı, 1000 AI Limiti.
* `[ 4.3 ]` **Front-end (Admin Panel UI):** Admin arayüzündeki Kullanım Çubuğunu (`AdminUsageBar`), kullanıcının kotaları doluluğa yaklaştığında kırmızı renkle (uyarı) gösterecek şekilde güncelleyin.
* `[ 4.4 ]` **Back-end (Veritabanı SEO ve Karakter Sınırları):** Menü/UI taşmalarını engellemek ve spam/SEO standartlarını korumak için `provisioning.py` içerisindeki Constraints (Kısıtlamalar) ayarlarını güncelleyin:
* `category` ve `heading` Adı (Name/Title): Min: 3, Max: 25 Karakter.
* `category` ve `heading` SEO Açıklaması: Min: 50, Max: 160 Karakter.
* `content` Açıklaması (UI Özet): Min: 30, Max: 200 Karakter.
* `content` Metni (Content Body): Min: 200, Max: 50.000 Karakter.


* `[ 4.5 ]` **Hata & Dil:** Kullanıcı bu limitlere (karakter sınırları veya paket limitleri) takıldığında, işlemi durdurup kendi dilinde anında hata gösterin ("İçerik metni en az 200 karakter olmalıdır", "Ücretsiz plan limitinize ulaştınız" vb.).

### 5. Abonelik ve Ödeme Altyapısı (Monetization)

* `[ 5.1 ]` **Back-end (Modelleme):** Subscription modelini veya Stripe/Iyzico/PayPal Müşteri Kimliği (Customer ID) kolonlarını veritabanına ekleyin.
* `[ 5.2 ]` **Entegrasyon & Webhook:** Ödeme geçidi API'sini (Stripe/Iyzico/PayPal) bağlayın. Başarılı/başarısız ödemeleri yakalayacak Webhook endpoint'lerini yazın.
* `[ 5.3 ]` **İş Mantığı (Plan Güncelleme):** Ödeme başarılı olduğunda kullanıcının `tenant.plan_code` değerini otomatik olarak 'pro' veya ilgili plana yükseltin. (Bu işlem Puan Bazlı Algoritmadaki "Current Load" değerini anında değiştirecektir).
* `[ 5.4 ]` **Mobil Ödeme Ekranı, Hata & Dil:** Ödeme/Plan seçimi ve kart formu ekranlarını tamamen mobil uyumlu (responsive) yapın. Ödeme reddedildiğinde, kart süresi bittiğinde veya limit yetersiz olduğunda bankadan dönen hatayı 3 dilde kullanıcıya anlaşılır şekilde yansıtın.

### 6. Kullanıcı İlk Giriş Deneyimi (Onboarding)

* `[ 6.1 ]` **Back-end (provisioning.py):** Yeni bir tenant (şirket/alan) oluşturulduğunda veritabanına otomatik olarak varsayılan "Hoş Geldiniz" kategorisini ve "İlk başlığım" adlı örnek döküman içeriğini ekleyin.
* `[ 6.2 ]` **Çoklu Dil Desteği (i18n):** Bu otomatik oluşturulan örnek içeriklerin dili, kullanıcının kayıt olurken seçtiği sistem diliyle (3 dilden hangisiyse) eşleşmelidir.
* `[ 6.3 ]` **Hata Yönetimi:** Örnek içeriklerin oluşturulması sırasında bir hata meydana gelirse, tenant açılış sürecinin tamamen tıkanmasını önleyecek hata yakalama mekanizmasını kurun.

---

## 🔒 Aşama 3: Premium Özellikler (Sadece Pro)

### 7. Gizli Dokümanlar (Private/Protected Docs)

* `[ 7.1 ]` **Back-end (Modelleme):** `category` veya `tenant` modellerine `is_private` (boolean) ve `password_hash` alanlarını ekleyin (Alembic).
* `[ 7.2 ]` **Front-end (Şifre Giriş Ekranı - Mobil Uyumlu):** Şifreli bir kategoriye girildiğinde içeriği gizleyen ve kullanıcıdan şifre isteyen mobil uyumlu temiz bir giriş ekranı tasarlayın (JWT tabanlı session).
* `[ 7.3 ]` **Hata & Dil:** Yanlış şifre girildiğinde veya oturum süresi dolduğunda gösterilecek uyarı mesajlarını 3 dilde hazırlayın ("Hatalı şifre girdiniz", "Oturum süreniz doldu" vb.).

### 8. Premium UI/UX Paketi (Pro Sürüm Vitrin Tasarımı)

> **Mantık:** Ücretsiz sürümdeki temiz fakat standart görünüm yerine, sadece Pro şirketlere satılacak olan prestijli, modern Apple/Vercel standartlarında arayüz paketi.

* `[ 8.1 ]` **Front-end (Bento Grid Tasarımı - Mobil Uyumlu):** Pro sürümde kategorileri ve başlıkları, alt alta klasik çizgilerle değil; havada asılı duran, köşeleri yuvarlatılmış ve hafif gölgeli modern "Bento Box" kartları şeklinde listeleyin.
* `[ 8.2 ]` **Back-end & Front-end (Özel İkon ve Emoji Desteği):** Veritabanına `icon` adlı bir sütun ekleyin. Pro şirketlerin her kategori/başlık için klasik SVG'ler yerine kendi istedikleri Emojileri (🚀, 💡, ⚙️) veya 3D ikonları seçebilmelerini sağlayın.
* `[ 8.3 ]` **Front-end (Glassmorphism & Mesh Gradient):** Pro kartların arka planlarını düz beyaz veya siyah olmaktan çıkarıp, şirketin tema rengiyle uyumlu hafif renk geçişleri (gradient) veya bulanık cam efekti (glassmorphism) ile zenginleştirin.
* `[ 8.4 ]` **Front-end (Mikro-Animasyonlar):** Framer Motion kullanarak, kartların üzerine fare ile gelindiğinde pürüzsüzce havaya kalkmasını ve buton tıklamalarında yumuşak dalga (ripple) efektleri oluşmasını sağlayın. Performansı düşürmeden mobil uyumlu çalıştırın.
* `[ 8.5 ]` **Front-end (Marka Renklerinin Tam Enjeksiyonu):** Seçilen marka rengini Tailwind'in kök CSS değişkenlerine enjekte ederek arama çubuğu çizgilerinden tüm link renklerine kadar sitenin tamamen "Kurumsal Renge" bürünmesini sağlayın.

---

## 🤖 Aşama 4: AI ve Otomasyon (Fark Yaratan Özellikler)

### 9. AI Doküman Asistanı (RAG-based Chatbot)

* `[ 9.1 ]` **Back-end (Veri Parçalama & Embedding):** İçerikler kaydedildiğinde metni anlamlı parçalara (chunks) bölün ve OpenAI/ilgili model ile vektör haline getirip vektör veritabanına (veya Meilisearch Vector) Celery yardımıyla arka planda kaydedin.
* `[ 9.2 ]` **Back-end (Chat Endpoint & Kota Kontrolü):** `/api/chat` endpoint'ini yazın. Gelen soruyu vektöre çevirip RAG mimarisiyle cevap üretin. Limit kontrolünü `tenancy.py` içindeki `increment_tenant_usage_or_403` fonksiyonu ile yönetin.
* `[ 9.3 ]` **Front-end (Sohbet Penceresi - Mobil Uyumlu):** Public sayfalara eklenecek AI chat penceresini mobil ekranları kapatmayacak ve kaydırma sorunları yaratmayacak şekilde (responsive chat UI) geliştirin.
* `[ 9.4 ]` **Hata & Dil:** Aylık AI kotası dolduğunda, yapay zeka servisine ulaşılamadığında veya geçersiz soru sorulduğunda kullanıcıya 3 dilde hata mesajı dönün ("Aylık yapay zeka kotanız dolmuştur", "Servis geçici olarak servis dışı" vb.).

### 10. API Referans Otomasyonu (Swagger/OpenAPI Import)

* `[ 10.1 ]` **Back-end (Parser Servisi):** Yüklenen bir `openapi.json` dosyasını ayrıştırıp her "Tag"i bir Kategori, her "Endpoint"i bir Başlık/İçerik olarak veritabanına otomatik INSERT eden servisi yazın.
* `[ 10.2 ]` **Front-end (Admin Paneli - Mobil Uyumlu):** Yönetim paneline dosya sürükleyip bırakılabilen responsive bir "Swagger İçerik Aktar" butonu/alanı ekleyin.
* `[ 10.3 ]` **Hata & Dil:** Dosya formatı hatalı olduğunda, şema uyuşmadığında veya yükleme yarıda kaldığında kullanıcıya 3 dilde geri bildirim verin ("Geçersiz OpenAPI şeması", "İçe aktarma başarıyla tamamlandı" vb.).






Ek Görevler Paketi (Add-on Features)
Mevcut SaaS yol haritasına ek olarak, aşağıdaki iki yeni özelliğin de sisteme aynı geliştirme standartlarında (Mobil uyumlu, 3 dil destekli ve hata/geri bildirim mesajlarıyla) entegre edilmesi gerekmektedir.

📝 Ek Görev 1: Onaylı ve Kapsamlı Hesap Silme İşlemi (Account Deletion)
Mantık: Kullanıcının (Tenant yöneticisinin) kendi sistemini, verilerini ve aboneliğini tamamen silebilmesi için güvenli, kazara silmeleri önleyen onaylı bir sistem kurulmalıdır.

[ 1.1 ] Back-end (Delete Endpoint): /api/tenant/delete adında kapsamlı bir silme servisi yazın. Bu servis veritabanındaki kullanıcıya ait tüm kategorileri, içerikleri, logları, tenant kaydını ve varsa aktif aboneliklerini (Stripe/Iyzico iptali dahil) temizlemelidir.

[ 1.2 ] Back-end (Güvenlik ve Onay): Silme endpoint'i, istek gövdesinde (payload) zorunlu bir onay metni beklemelidir (Örn: Kullanıcının kendi alan adını veya "onaylıyorum" kelimesini yazması). Bu metin eşleşmezse işlem 400 Bad Request ile reddedilmelidir.

[ 1.3 ] Front-end (Silme Arayüzü - Mobil Uyumlu): Ayarlar bölümüne kırmızı ve dikkat çekici bir "Hesabımı Sil (Danger Zone)" alanı ekleyin. Butona tıklandığında, kazara tıklamaları önlemek için ekranda (özellikle mobilde ekranı düzgün kaplayan) bir Modal/Popup açılmalı ve kullanıcıdan onay kelimesini metin kutusuna yazması istenmelidir.

[ 1.4 ] Hata & Dil: Açılan onay penceresindeki uyarılar ("Tüm verileriniz kalıcı olarak silinecektir"), girilmesi gereken onay kelimesi ve işlem sonrası başarı/hata mesajları ("Hesabınız silindi", "Onay metni hatalı") kullanıcının seçtiği sistem dilinde (3 dil destekli) gösterilmelidir.

📝 Ek Görev 2: Pro Kullanıcılar İçin Varsayılan Alt Alan Adı Seçeneği (Subdomain Fallback)
Mantık: Pro (ücretli) plana sahip olan kullanıcılar, "Özel Alan Adı (Custom Domain)" bağlamak zorunda değildir. İsterlerse Free planda sunduğumuz varsayılan alt alan adı (Örn: [bizimsite.com/d/sirketadi](https://bizimsite.com/d/sirketadi)) yapısını kullanmaya devam edebilmelidirler.

[ 2.1 ] Back-end (Esnek Custom Domain): Veritabanındaki custom_domain alanı Pro kullanıcılar için zorunlu (required) olmamalıdır (nullable bırakılmalı).

[ 2.2 ] Front-end (Domain Seçim Arayüzü - Mobil Uyumlu): Pro kullanıcıların "Alan Adı Ayarları" sayfasına iki seçenekli bir geçiş (Radio button veya Toggle) ekleyin:

Varsayılan adresi kullan (.../d/sirketadi)

Kendi özel alan adımı bağla (docs.sirketadi.com)

[ 2.3 ] Middleware Yönlendirmesi (Next.js): Yönlendirme (routing) dosyasında kuralı güncelleyin. Eğer Pro kullanıcının veritabanında custom_domain sütunu boşsa, sistem onu otomatik olarak normal Free kullanıcılar gibi /d/[tenantSlug] rotasından çalıştırmaya devam etsin.

[ 2.4 ] Hata & Dil: Kullanıcı bu iki seçenek arasında geçiş yaptığında ("Ayarlar güncellendi", "Artık varsayılan adresi kullanıyorsunuz" vb.) uyarı ve bilgilendirme mesajları mobil uyumlu şekilde ve 3 dilde gösterilmelidir.