"""
4 kullanici, tam icerik testi — Next.js proxy uzerinden, CSRF dogrulama ile.
Idempotent: 409 hatalarında mevcut item'i getirir, test tekrar calistirilabiir.
"""
import re, sys, time
import requests

PROXY   = "http://localhost:3000/api"   # Next.js proxy
BASE    = "http://localhost:8000"       # Dogrudan backend (signup/verify/public)
MAILHOG = "http://localhost:8025"
BUGS    = []

def log(m):  print(f"  {m}")
def bug(b):  BUGS.append(b); print(f"  BUG: {b}")
def ok(m):   print(f"  OK  {m}")
def sec(m):  print(f"\n{'='*60}\n  {m}\n{'='*60}")

def clear_mailhog():
    requests.delete(f"{MAILHOG}/api/v1/messages")

def get_token_mailhog(email, retries=14):
    for _ in range(retries):
        r = requests.get(f"{MAILHOG}/api/v2/messages?limit=50")
        if r.ok:
            for msg in r.json().get("items", []):
                to = str(msg.get("Content", {}).get("Headers", {}).get("To", ""))
                if email not in to:
                    continue
                body = msg.get("Content", {}).get("Body", "")
                tokens = re.findall(r"token=([A-Za-z0-9_\-]{20,})", body)
                if tokens:
                    return tokens[0]
        time.sleep(0.8)
    return None

def signup_flow(email, password, name, slug):
    clear_mailhog()
    r = requests.post(f"{BASE}/auth/signup", json={
        "email": email, "password": password,
        "workspace_name": name, "tenant_slug": slug
    })
    if r.status_code == 409:
        log("Zaten kayitli")
        return True
    if r.status_code not in (200, 201):
        bug(f"signup {slug}: {r.status_code} {r.text[:120]}")
        return False
    ok("Kayit basarili")
    dev = r.json().get("dev_verification_token")
    if dev:
        requests.post(f"{BASE}/auth/verify-email", json={"token": dev})
        ok("Dogrulandi (dev token)")
    else:
        log("Mailhog token bekleniyor...")
        token = get_token_mailhog(email)
        if not token:
            bug(f"{slug}: Mailhog token alinamadi")
            return False
        rv = requests.post(f"{BASE}/auth/verify-email", json={"token": token})
        if rv.ok:
            ok("Dogrulandi (Mailhog)")
        else:
            bug(f"{slug} verify: {rv.status_code} {rv.text[:100]}")
            return False
    return True

class AdminSession:
    """Proxy uzerinden, CSRF token icerecek sekilde istek gonderen yardimci."""
    def __init__(self, slug):
        self.slug = slug
        self.s = requests.Session()
        self.csrf = None

    def login(self, email, password):
        r = self.s.post(f"{PROXY}/auth/login",
                        json={"email": email, "password": password})
        if not r.ok:
            bug(f"login {self.slug}: {r.status_code}")
            return False
        data = r.json()
        r2 = self.s.post(f"{PROXY}/auth/select-workspace",
                         json={"selection_token": data["selection_token"],
                               "tenant_slug": self.slug})
        if not r2.ok:
            bug(f"select-workspace {self.slug}: {r2.status_code} {r2.text[:80]}")
            return False
        # CSRF cookie'yi bul (birden fazla ayni isimli cookie olabilir — /api/ path'ini sec)
        for c in self.s.cookies:
            if c.name == f"adm_csrf_{self.slug.replace('-','_')}" and "/api/" in c.path:
                self.csrf = c.value
                break
        if not self.csrf:
            bug(f"{self.slug}: CSRF cookie bulunamadi")
            return False
        ok(f"[{self.slug}] Giris yapildi (CSRF: {self.csrf[:12]}...)")
        return True

    def get(self, path):
        return self.s.get(f"{PROXY}/t/{self.slug}/admin{path}")

    def post(self, path, **kwargs):
        h = kwargs.pop("headers", {})
        h["X-CSRF-Token"] = self.csrf
        return self.s.post(f"{PROXY}/t/{self.slug}/admin{path}", headers=h, **kwargs)

    def put(self, path, **kwargs):
        h = kwargs.pop("headers", {})
        h["X-CSRF-Token"] = self.csrf
        return self.s.put(f"{PROXY}/t/{self.slug}/admin{path}", headers=h, **kwargs)

    def delete(self, path, **kwargs):
        h = kwargs.pop("headers", {})
        h["X-CSRF-Token"] = self.csrf
        return self.s.delete(f"{PROXY}/t/{self.slug}/admin{path}", headers=h, **kwargs)


# ── Idempotent yardimci fonksiyonlar ──────────────────────────

def cat(a, name, desc="", i=0):
    r = a.post("/categories", json={"name": name, "description": desc, "sort_order": i})
    if r.status_code == 409:
        # Mevcut kategoriyi getir
        lst = a.get("/categories")
        if lst.ok:
            for item in lst.json():
                if item.get("name", "").lower() == name.lower():
                    log(f"[{a.slug}] Kategori mevcut (ID alindi): {name}")
                    return item
        log(f"[{a.slug}] Kategori mevcut (ID alinamadi): {name}")
        return None
    if r.status_code not in (200, 201):
        bug(f"[{a.slug}] cat {name}: {r.status_code} {r.text[:80]}")
        return None
    ok(f"[{a.slug}] Kategori: {name}")
    return r.json()

def h1(a, cid, title, desc=""):
    # Önce mevcut basliklardan ara (tekrar olusturmamak icin)
    lst = a.get("/headings")
    if lst.ok:
        for item in lst.json():
            if (item.get("level") == 1
                    and str(item.get("category_id")) == str(cid)
                    and item.get("title", "").lower() == title.lower()):
                log(f"[{a.slug}] H1 mevcut (ID alindi): {title}")
                return item
    # Bulunamadi, yeni olustur
    r = a.post("/headings", json={"level": 1, "category_id": str(cid),
               "title": title, "description": desc, "sort_order": 0})
    if r.status_code == 409:
        # Yarisma durumu - tekrar ara
        lst2 = a.get("/headings")
        if lst2.ok:
            for item in lst2.json():
                if (item.get("level") == 1
                        and str(item.get("category_id")) == str(cid)
                        and item.get("title", "").lower() == title.lower()):
                    log(f"[{a.slug}] H1 mevcut (ID alindi): {title}")
                    return item
        return None
    if r.status_code not in (200, 201):
        bug(f"[{a.slug}] H1 {title}: {r.status_code} {r.text[:80]}")
        return None
    ok(f"[{a.slug}]  H1: {title}")
    return r.json()

def h2(a, pid, title, desc=""):
    # Önce mevcut basliklardan ara (tekrar olusturmamak icin)
    lst = a.get("/headings")
    if lst.ok:
        for item in lst.json():
            if (item.get("level") == 2
                    and str(item.get("parent_heading_id")) == str(pid)
                    and item.get("title", "").lower() == title.lower()):
                log(f"[{a.slug}] H2 mevcut (ID alindi): {title}")
                return item
    # Bulunamadi, yeni olustur
    r = a.post("/headings", json={"level": 2, "parent_heading_id": str(pid),
               "title": title, "description": desc, "sort_order": 0})
    if r.status_code == 409:
        lst2 = a.get("/headings")
        if lst2.ok:
            for item in lst2.json():
                if (item.get("level") == 2
                        and str(item.get("parent_heading_id")) == str(pid)
                        and item.get("title", "").lower() == title.lower()):
                    log(f"[{a.slug}] H2 mevcut (ID alindi): {title}")
                    return item
        return None
    if r.status_code not in (200, 201):
        bug(f"[{a.slug}] H2 {title}: {r.status_code} {r.text[:80]}")
        return None
    ok(f"[{a.slug}]    H2: {title}")
    return r.json()

def content(a, hid, body, desc=""):
    r = a.post("/contents", json={"heading_id": str(hid), "body": body,
               "description": desc, "status": "published"})
    if r.status_code == 409:
        # Bu basligin icerigi zaten var — mevcut icerigi getir
        lst = a.get("/contents")
        if lst.ok:
            for item in lst.json():
                if str(item.get("heading_id")) == str(hid):
                    log(f"[{a.slug}] Icerik mevcut (ID alindi): {hid}")
                    return item
        log(f"[{a.slug}] Icerik mevcut (ID alinamadi): {hid}")
        return None
    if r.status_code not in (200, 201):
        bug(f"[{a.slug}] content: {r.status_code} {r.text[:80]}")
        return None
    ok(f"[{a.slug}]       Icerik oluşturuldu")
    return r.json()

def img(a, cid, url, alt="", so=0, w=None, h_=None):
    p = {"content_id": str(cid), "url": url, "alt": alt, "sort_order": so}
    if w:  p["width"] = w
    if h_: p["height"] = h_
    r = a.post("/content-images", json=p)
    if r.status_code == 409:
        log(f"[{a.slug}] Gorsel mevcut: {url[:40]}")
        return None
    if r.status_code not in (200, 201):
        bug(f"[{a.slug}] img: {r.status_code} {r.text[:80]}")
        return None
    ok(f"[{a.slug}]       Gorsel eklendi")
    return r.json()

def att(a, cid, url, label, fname, mime="application/pdf"):
    r = a.post("/content-attachments",
               json={"content_id": str(cid), "url": url, "label": label,
                     "file_name": fname, "mime_type": mime, "size_bytes": 12000})
    if r.status_code == 409:
        log(f"[{a.slug}] Ek mevcut: {label}")
        return None
    if r.status_code not in (200, 201):
        bug(f"[{a.slug}] att: {r.status_code} {r.text[:80]}")
        return None
    ok(f"[{a.slug}]       Dosya: {label}")
    return r.json()

def redir(a, src, dst, code=301):
    r = a.post("/redirects", json={"source_path": src, "target_path": dst,
               "status_code": code, "is_active": True, "note": "test"})
    if r.status_code == 409:
        log(f"[{a.slug}] Redirect mevcut: {src}")
        return None
    if r.status_code not in (200, 201):
        bug(f"[{a.slug}] redirect {src}: {r.status_code} {r.text[:80]}")
        return None
    ok(f"[{a.slug}] Redirect({code}): {src} -> {dst}")
    return r.json()

def settings(a, title):
    r = a.put("/settings", json={"site_title": title, "site_logo": ""})
    if r.status_code not in (200, 204):
        bug(f"[{a.slug}] settings: {r.status_code} {r.text[:80]}")
        return
    ok(f"[{a.slug}] Site: {title}")

def pub(slug, q):
    r = requests.get(f"{BASE}/t/{slug}/docs-index")
    if r.ok:
        ok(f"[{slug}] docs-index: {len(r.json())} kategori")
    else:
        bug(f"[{slug}] docs-index: {r.status_code}")
    r2 = requests.get(f"{BASE}/t/{slug}/search?q={q}&limit=5")
    if r2.ok:
        ok(f"[{slug}] search '{q}': {len(r2.json())} sonuc")
    else:
        bug(f"[{slug}] search '{q}': {r2.status_code}")

def redir_resolve(slug, path, exp_code):
    r = requests.get(f"{BASE}/t/{slug}/redirects/resolve?path={path}")
    if r.ok:
        sc = r.json().get("status_code")
        if sc == exp_code:
            ok(f"[{slug}] redirect resolve OK: {path} ({exp_code})")
        else:
            bug(f"[{slug}] redirect resolve kod: {sc} (beklenen: {exp_code})")
    else:
        bug(f"[{slug}] redirect resolve {path}: {r.status_code}")

def admin(slug, email, password):
    a = AdminSession(slug)
    if not a.login(email, password):
        return None
    return a

# ── TOPTANCI ──────────────────────────────────────────────────
sec("TOPTANCI - Ali Toptan Market (TR)")
if signup_flow("ali.toptanci@example.com", "Toptanci123!", "Ali Toptan Market", "toptancimarket"):
    a = admin("toptancimarket", "ali.toptanci@example.com", "Toptanci123!")
    if a:
        settings(a, "Ali Toptan Market")
        c1 = cat(a, "Elektronik Urunler", "Toptan elektronik", 0)
        c2 = cat(a, "Ev ve Yasam", "Ev esyalari", 1)
        if c1:
            h1tv = h1(a, c1["id"], "Televizyonlar", "4K ve HD")
            if h1tv:
                h2sam = h2(a, h1tv["id"], "Samsung Modelleri", "QLED ve OLED")
                h2lg  = h2(a, h1tv["id"], "LG Modelleri", "OLED")
                if h2sam:
                    co = content(a, h2sam["id"],
                        "## Samsung 4K TV\n\n| Model | Fiyat |\n|-------|-------|\n| QE55 | 18500 TL |\n| QE65 | 26800 TL |\n\n<--image-->\n\nMin siparis: 5 adet",
                        "Samsung toptan fiyat listesi")
                    if co:
                        img(a, co["id"], "https://images.unsplash.com/photo-1593359677879-a4bb92f4834a?w=800", "Samsung TV", w=800, h_=450)
                        img(a, co["id"], "https://images.unsplash.com/photo-1571415060716-baff5957e0e8?w=600", "Samsung kutu", so=1, w=600, h_=400)
                        att(a, co["id"], "https://example.com/katalog.pdf", "Samsung Katalog 2025", "samsung-katalog.pdf")
                if h2lg:
                    co2 = content(a, h2lg["id"],
                        "## LG OLED\n\n<--image-->\n\n| C3 55 | 32000 TL |\n| G3 65 | 58000 TL |",
                        "LG OLED toptan")
                    if co2:
                        img(a, co2["id"], "https://images.unsplash.com/photo-1461151304267-38535e780c79?w=700", "LG OLED", w=700, h_=467)
        if c2:
            h1m = h1(a, c2["id"], "Mutfak Aletleri", "Blender, kahve")
            if h1m:
                h2b = h2(a, h1m["id"], "Blenderlar", "Endustriyel")
                if h2b:
                    co3 = content(a, h2b["id"],
                        "## Blender\n\n<--image-->\n\n- Pro-Blend 2000W: 850 TL\n- Mini 800W: 350 TL",
                        "Blender fiyat listesi")
                    if co3:
                        img(a, co3["id"], "https://images.unsplash.com/photo-1585515320310-259814833e62?w=700", "Blender", w=700, h_=500)
        redir(a, "/elektronik", "/elektronik-urunler", 301)
        redir(a, "/kampanya", "/ev-ve-yasam", 302)
        time.sleep(2); pub("toptancimarket", "samsung"); redir_resolve("toptancimarket", "/elektronik", 301)

# ── MOTOSİKLET ────────────────────────────────────────────────
sec("MOTOSIKLET - Ahmed Moto Store (AR)")
if signup_flow("ahmed.moto@example.com", "Moto1234!", "Ahmed Moto Store", "motostore"):
    a = admin("motostore", "ahmed.moto@example.com", "Moto1234!")
    if a:
        settings(a, "Ahmed Moto Store")
        c1 = cat(a, "الدراجات النارية", "دراجات نارية", 0)
        c2 = cat(a, "قطع الغيار", "قطع غيار أصلية", 1)
        if c1:
            h1sp = h1(a, c1["id"], "الدراجات الرياضية", "موتوسيكلات رياضية")
            if h1sp:
                h2ya = h2(a, h1sp["id"], "ياماها YZF", "سلسلة ياماها")
                h2ho = h2(a, h1sp["id"], "هوندا CBR", "سلسلة هوندا")
                if h2ya:
                    co = content(a, h2ya["id"],
                        "## ياماها YZF-R1\n\n<--image-->\n\n| المحرك | 998 سي سي |\n| القوة | 200 حصان |\n\nالسعر: 185,000 ريال\n\n<--image-->",
                        "ياماها YZF مواصفات وأسعار")
                    if co:
                        img(a, co["id"], "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", "ياماها YZF-R1", w=800, h_=500)
                        img(a, co["id"], "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=700", "دراجة رياضية", so=1, w=700, h_=467)
                if h2ho:
                    co_ho = content(a, h2ho["id"],
                        "## هوندا CBR\n\n<--image-->\n\n| المحرك | 1000 سي سي |\n| القوة | 190 حصان |\n\nالسعر: 175,000 ريال",
                        "هوندا CBR مواصفات وأسعار")
                    if co_ho:
                        img(a, co_ho["id"], "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800", "هوندا CBR", w=800, h_=500)
        if c2:
            h1acc = h1(a, c2["id"], "الخوذات والحماية", "خوذات احترافية")
            if h1acc:
                co2 = content(a, h1acc["id"],
                    "## الخوذات\n\n<--image-->\n\n1. Shoei\n2. Arai\n3. AGV\n\n<--file-->",
                    "أفضل خوذات الدراجات")
                if co2:
                    img(a, co2["id"], "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=700", "خوذة", w=700, h_=467)
                    att(a, co2["id"], "https://example.com/helmet.pdf", "كتالوج الخوذات 2025", "helmet-2025.pdf")
        redir(a, "/yamaha", "/الدراجات-الرياضية", 301)
        time.sleep(2); pub("motostore", "ياماها")

# ── GAZETECİ ──────────────────────────────────────────────────
sec("GAZETECI - Jane Press Archive (EN)")
if signup_flow("jane.reporter@example.com", "Reporter456!", "Jane Press Archive", "newsjane"):
    a = admin("newsjane", "jane.reporter@example.com", "Reporter456!")
    if a:
        settings(a, "Jane Press Archive")
        c1 = cat(a, "Investigative Reports", "In-depth journalism", 0)
        c2 = cat(a, "Tech and Society", "AI and digital rights", 1)
        c3 = cat(a, "Sources and Resources", "Journalist toolkit", 2)
        if c1:
            h1env = h1(a, c1["id"], "Environmental Investigations", "Climate and pollution")
            if h1env:
                h2wat  = h2(a, h1env["id"], "Water Pollution Reports", "Industrial contamination")
                h2clim = h2(a, h1env["id"], "Climate Policy Watch", "Climate commitments")
                if h2wat:
                    co = content(a, h2wat["id"],
                        "## Water Investigation\n\n<--image-->\n\n| Metric | Number |\n|--------|--------|\n| Violations | 47 |\n| Avg fine | $2,300 |\n\n*March 2025 - Jane Doe*\n\n<--image-->\n\n<--file-->",
                        "3-year industrial water pollution investigation")
                    if co:
                        img(a, co["id"], "https://images.unsplash.com/photo-1542601906897-3f3c5e46bd6e?w=900", "River pollution", w=900, h_=600)
                        img(a, co["id"], "https://images.unsplash.com/photo-1558008258-3256397925b0?w=800", "Water sampling", so=1, w=800, h_=533)
                        att(a, co["id"], "https://example.com/water-report.pdf", "Full Investigation Report", "water-2025.pdf")
                if h2clim:
                    co_clim = content(a, h2clim["id"],
                        "## Climate Policy Watch\n\n<--image-->\n\nTracking 12 nations' climate commitments since 2020.\n\n**Key findings:** 7 countries on track, 5 lagging.",
                        "International climate policy tracking")
                    if co_clim:
                        img(a, co_clim["id"], "https://images.unsplash.com/photo-1586348943529-beaae6c28db9?w=800", "Climate", w=800, h_=533)
        if c2:
            h1ai = h1(a, c2["id"], "AI and Journalism", "AI in the newsroom")
            if h1ai:
                h2df = h2(a, h1ai["id"], "Deepfakes in Misinformation", "AI disinformation")
                if h2df:
                    co2 = content(a, h2df["id"],
                        "## Deepfakes 2024\n\n<--image-->\n\n23 documented cases across 8 countries.\n\n**Tools:** Sensity AI, FotoForensics, InVID",
                        "AI disinformation tracking")
                    if co2:
                        img(a, co2["id"], "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800", "Misinformation", w=800, h_=533)
        if c3:
            h1tools = h1(a, c3["id"], "Journalist Toolkit", "Essential tools")
            if h1tools:
                co3 = content(a, h1tools["id"],
                    "## Resources\n\n- OpenSecrets\n- ProPublica\n- PACER\n\n<--file-->",
                    "Curated toolkit")
                if co3:
                    att(a, co3["id"], "https://example.com/foia.docx", "FOIA Template", "foia-template.docx",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        redir(a, "/water-report", "/investigative-reports/environmental-investigations/water-pollution-reports", 301)
        redir(a, "/ai-news", "/tech-and-society", 302)
        time.sleep(2); pub("newsjane", "water"); redir_resolve("newsjane", "/water-report", 301)

# ── EĞİTİMCİ ──────────────────────────────────────────────────
sec("EGITIMCI - Fatma Ogretmen Akademi (TR)")
if signup_flow("fatma.egitimci@example.com", "Egitim789!", "Fatma Ogretmen Akademi", "fatmaegitim"):
    a = admin("fatmaegitim", "fatma.egitimci@example.com", "Egitim789!")
    if a:
        settings(a, "Fatma Ogretmen Akademi")
        c1 = cat(a, "Python Programlama", "Sifirdan ileri Python", 0)
        c2 = cat(a, "Veri Bilimi", "ML ve veri analizi", 1)
        c3 = cat(a, "Ucretsiz Kaynaklar", "Ucretsiz materyaller", 2)
        if c1:
            h1t = h1(a, c1["id"], "Python Temelleri", "Degiskenler, donguler")
            h1i = h1(a, c1["id"], "Ileri Python", "OOP, dekoratorler")
            h1p = h1(a, c1["id"], "Bitirme Projeleri", "Gercek dunya")
            if h1t:
                h2d = h2(a, h1t["id"], "Degiskenler ve Tipler", "int,str,list,dict")
                h2l = h2(a, h1t["id"], "Donguler ve Kosullar", "for,while,if")
                h2f = h2(a, h1t["id"], "Fonksiyonlar", "def,return,lambda")
                if h2d:
                    co = content(a, h2d["id"],
                        '## Degiskenler\n\n<--image-->\n\n```python\nisim = "Fatma"\nyas = 28\nnotlar = [85, 92, 78]\n```\n\n<--image-->',
                        "Python veri tipleri")
                    if co:
                        img(a, co["id"], "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=900", "Python kod", w=900, h_=600)
                        img(a, co["id"], "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=700", "Matrix", so=1, w=700, h_=467)
                if h2l:
                    content(a, h2l["id"],
                        "## Donguler\n\n```python\nfor i in range(5):\n    print(i)\n```", "for ve while")
                if h2f:
                    content(a, h2f["id"],
                        "## Fonksiyonlar\n\n```python\ndef topla(a,b):\n    return a+b\n```", "Python fonksiyonlar")
            if h1i:
                h2oop = h2(a, h1i["id"], "OOP", "Nesne yonelimli")
                if h2oop:
                    co2 = content(a, h2oop["id"],
                        '## OOP\n\n<--image-->\n\n```python\nclass Ogrenci:\n    def __init__(self,isim,yas):\n        self.isim=isim\n```',
                        "Python OOP siniflar")
                    if co2:
                        img(a, co2["id"], "https://images.unsplash.com/photo-1603468620905-8de7d86b781e?w=800", "OOP diyagram", w=800, h_=533)
            if h1p:
                h2(a, h1p["id"], "ToDo Uygulamasi", "Flask+SQLite")
                h2(a, h1p["id"], "Web Scraper", "BeautifulSoup")
        if c2:
            h1ml = h1(a, c2["id"], "Makine Ogrenmesi", "scikit-learn temelleri")
            if h1ml:
                h2cls = h2(a, h1ml["id"], "Siniflandirma", "SVM, Karar Agaci")
                if h2cls:
                    co_ml = content(a, h2cls["id"],
                        "## Siniflandirma\n\n```python\nfrom sklearn.svm import SVC\nmodel = SVC()\nmodel.fit(X_train, y_train)\n```\n\nDogruluk: %92",
                        "Makine ogrenmesi siniflandirma yontemleri")
                    if co_ml:
                        img(a, co_ml["id"], "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", "Veri bilimi", w=800, h_=533)
        if c3:
            h1k = h1(a, c3["id"], "Ucretsiz PDF ve Notlar", "Indirilebilir")
            if h1k:
                co3 = content(a, h1k["id"],
                    "## Materyaller\n\n### Python Notlari\n<--file-->\n\n### Veri Bilimi\n<--file-->\n\n### 100 Soru\n<--file-->",
                    "Ucretsiz ders notlari")
                if co3:
                    att(a, co3["id"], "https://example.com/python-notlar.pdf", "Python Notlar 1-5", "python-notlar.pdf")
                    att(a, co3["id"], "https://example.com/veri-bilimi.pdf", "Veri Bilimi Rehberi", "veri-bilimi.pdf")
                    att(a, co3["id"], "https://example.com/100-soru.pdf", "100 Python Sorusu", "100-soru.pdf")
        redir(a, "/python", "/python-programlama", 301)
        redir(a, "/ucretsiz", "/ucretsiz-kaynaklar", 301)
        time.sleep(2); pub("fatmaegitim", "python"); redir_resolve("fatmaegitim", "/python", 301)

# ── SINIR KOŞULLARI ───────────────────────────────────────────
sec("SINIR KOSULLARI")

r = requests.get(f"{BASE}/t/hicbiryokbilemiyorum999/menu")
if r.status_code == 404: ok("Var olmayan tenant -> 404")
else: bug(f"Var olmayan tenant -> {r.status_code}")

a2 = admin("toptancimarket", "ali.toptanci@example.com", "Toptanci123!")
if a2:
    r = a2.post("/redirects", json={"source_path": "/loop", "target_path": "/loop", "status_code": 301, "is_active": True})
    if r.status_code == 422: ok("src=dst redirect -> 422")
    else: bug(f"src=dst -> {r.status_code}")

    r = a2.post("/redirects", json={"source_path": "/test307", "target_path": "/baska", "status_code": 307, "is_active": True})
    if r.status_code == 422: ok("307 kodu -> 422")
    else: bug(f"307 kodu -> {r.status_code}")

    r1 = a2.post("/redirects", json={"source_path": "/duptest2", "target_path": "/h1", "status_code": 301, "is_active": True})
    r2_dup = a2.post("/redirects", json={"source_path": "/duptest2", "target_path": "/h2", "status_code": 302, "is_active": True})
    if r1.status_code in (200, 201) and r2_dup.status_code == 409: ok("Duplicate source -> 409")
    elif r1.status_code == 409 and r2_dup.status_code == 409: ok("Duplicate source (onceden olusturulmus) -> 409")
    else: bug(f"Duplicate source: r1={r1.status_code}, r2={r2_dup.status_code}")

    heads_r = a2.get("/headings")
    conts_r = a2.get("/contents")
    if heads_r.ok:
        all_heads = heads_r.json()
        # H1'lerin id setini ve cocugu olanların setini hesapla
        h2_parent_ids = {str(h.get("parent_heading_id")) for h in all_heads if h.get("level") == 2}
        # İcerik olmayan H2'yi veya cocugu olmayan H1'i bul
        existing_content_heading_ids = set()
        if conts_r.ok:
            existing_content_heading_ids = {str(c.get("heading_id")) for c in conts_r.json()}
        # H2 heading'leri tercih et (cocugu olmaz), icerik yoksa kullan
        target_heading = None
        for h in all_heads:
            if h.get("level") == 2 and str(h.get("id")) not in existing_content_heading_ids:
                target_heading = h
                break
        if not target_heading:
            # H2 bulunamazsa icerik+cocuk olmayan H1 dene
            for h in all_heads:
                if (h.get("level") == 1
                        and str(h.get("id")) not in h2_parent_ids
                        and str(h.get("id")) not in existing_content_heading_ids):
                    target_heading = h
                    break
        if target_heading:
            cr = a2.post("/contents", json={"heading_id": target_heading["id"],
                         "body": "Draft test icerik — durum drafttan publishe degismeli.", "status": "draft"})
            if cr.status_code in (200, 201):
                ok("Draft icerik olusturuldu")
                cid = cr.json()["id"]
                pu = a2.put(f"/contents/{cid}", json={"status": "published"})
                if pu.ok: ok("Draft -> published guncellendi")
                else: bug(f"Draft->published: {pu.status_code}")
            elif cr.status_code == 409:
                ok("Draft test: icerik zaten var (idempotent)")
            else:
                bug(f"Draft olusturulamadi: {cr.status_code} {cr.text[:80]}")
        else:
            log("[toptancimarket] Draft testi icin uygun heading bulunamadi (hepsi dolu)")

# Public stats endpoint testi
sec("PUBLIC STATS")
sr = requests.get(f"{BASE}/platform/public-stats")
if sr.ok:
    d = sr.json()
    ok(f"Kayitli kullanici: {d['registered_users']}, Aktif oturum: {d['active_sessions']}")
else:
    bug(f"public-stats: {sr.status_code}")

for slug in ["toptancimarket", "motostore", "newsjane", "fatmaegitim"]:
    r = requests.get(f"{BASE}/t/{slug}/docs-index")
    if r.ok: ok(f"[{slug}] docs-index: {len(r.json())} kategori")
    else: bug(f"[{slug}] docs-index: {r.status_code}")

# ── SONUÇ ─────────────────────────────────────────────────────
print(f"\n{'='*60}\n  TEST SONUCLARI\n{'='*60}")
if not BUGS:
    print("\n  Hic bug bulunamadi!\n")
else:
    print(f"\n  {len(BUGS)} sorun tespit edildi:\n")
    for i, b in enumerate(BUGS, 1):
        print(f"  {i:2}. {b}")
print()
