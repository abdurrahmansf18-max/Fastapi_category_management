# Documentation Platform (FastAPI + React)

This project is a full-stack documentation platform where you can manage content in a category- and heading-based structure.

- Backend: FastAPI + PostgreSQL
- Frontend: React + TypeScript + Vite
- Admin panel: Manage categories, headings (L1/L2), content, and content images after admin login
- Public side: Documentation browsing, search, and content display for end users

## What is it for?

With this application, you can:

- Build a multi-level documentation structure (Category -> L1 Heading -> L2 Heading).
- Add content under headings and manage related images.
- Edit, delete, and update content from the admin panel.
- Let users browse and search documentation on the public interface.

## Project Structure

```text
Fastapi/
  backend/    # FastAPI API, DB operations, migration and SQL
  frontend/   # React + Vite UI (admin + public)
  uploads/    # Uploaded files/images
```

## Requirements

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

## 1) Backend Setup

Run the following steps inside the backend folder.

### 1.1 Virtual environment and dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 1.2 Database preparation

1. Create a PostgreSQL database (default name: Documantasion_Sys).
2. Run backend/DDL.sql.
3. Run the migration script for site settings table:

```powershell
python run_migration.py
```

### 1.3 Environment variables (.env)

Create backend/.env and fill it like this:

```env
DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5432/Documantasion_Sys
SECRET_KEY=supersecretkey123changeit
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_ORIGIN=http://localhost:5173

UPLOADS_DIR=uploads
STATIC_MOUNT_PATH=/static
STATIC_BASE_URL=http://localhost:8000/static
MAX_UPLOAD_BYTES=5242880
ALLOWED_MIME=image/jpeg,image/png,image/webp,image/gif
```

### 1.4 Run backend

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Check:

- Health: http://localhost:8000/healthz
- Swagger: http://localhost:8000/docs

## 2) Frontend Setup

Run the following steps inside the frontend folder.

### 2.1 Dependencies

```powershell
cd frontend
npm install
```

### 2.2 Environment variables (.env)

By default, Vite dev proxy forwards backend requests to http://localhost:8000.

Optionally, create frontend/.env with:

```env
VITE_BACKEND_ORIGIN=http://localhost:8000
VITE_API_BASE=/api
```

### 2.3 Run frontend

```powershell
npm run dev
```

The app opens at http://localhost:5173 by default.

## First Usage Flow

1. Start backend and frontend.
2. Create the first admin user from http://localhost:8000/docs with POST /admin/init.
3. Sign in from the frontend admin page at /admin.
4. Create your categories, headings, and content.
5. Test the documentation on the public side (/).

## Notes

- In development mode, frontend requests are proxied to backend through /api.
- Uploaded files are served as static files from /static.
- The app includes SQL trigger rules for slug generation and content integrity (see backend/DDL.sql).

---

# Dokumantasyon Platformu (FastAPI + React)

Bu proje, kategori ve baslik bazli icerik yonetimi yapabileceginiz tam yigin bir dokumantasyon platformudur.

- Backend: FastAPI + PostgreSQL
- Frontend: React + TypeScript + Vite
- Yonetim paneli: Admin girisi ile kategori, baslik (L1/L2), icerik ve icerik gorselleri yonetimi
- Public taraf: Son kullanicilar icin dokumantasyon gezintisi, arama ve icerik goruntuleme

## Ne ise yarar?

Bu uygulama ile:

- Cok seviyeli dokumantasyon yapisi (Kategori -> L1 Baslik -> L2 Baslik) kurabilirsiniz.
- Her basliga icerik ekleyebilir ve gorsel yonetimi yapabilirsiniz.
- Admin panelinden icerikleri duzenleyebilir, silip guncelleyebilirsiniz.
- Public arayuzde kullanicilar dokumantasyonda gezinip arama yapabilir.

## Proje Yapisi

```text
Fastapi/
  backend/    # FastAPI API, DB islemleri, migration ve SQL
  frontend/   # React + Vite arayuzu (admin + public)
  uploads/    # Yuklenen dosyalar/gorseller
```

## Gereksinimler

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

## 1) Backend Kurulumu

Asagidaki adimlari backend klasorunde uygulayin.

### 1.1 Sanal ortam ve bagimliliklar

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 1.2 Veritabani hazirligi

1. PostgreSQL'de bir veritabani olusturun (varsayilan ad: Documantasion_Sys).
2. backend/DDL.sql dosyasini calistirin.
3. Site ayarlari tablosu icin migration scriptini calistirin:

```powershell
python run_migration.py
```

### 1.3 Ortam degiskenleri (.env)

backend/.env dosyasi olusturup asagidaki gibi doldurabilirsiniz:

```env
DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5432/Documantasion_Sys
SECRET_KEY=supersecretkey123changeit
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FRONTEND_ORIGIN=http://localhost:5173

UPLOADS_DIR=uploads
STATIC_MOUNT_PATH=/static
STATIC_BASE_URL=http://localhost:8000/static
MAX_UPLOAD_BYTES=5242880
ALLOWED_MIME=image/jpeg,image/png,image/webp,image/gif
```

### 1.4 Backend'i calistirma

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Kontrol:

- Health: http://localhost:8000/healthz
- Swagger: http://localhost:8000/docs

## 2) Frontend Kurulumu

Asagidaki adimlari frontend klasorunde uygulayin.

### 2.1 Bagimliliklar

```powershell
cd frontend
npm install
```

### 2.2 Ortam degiskenleri (.env)

Vite dev proxy varsayilan olarak backend'i http://localhost:8000 adresine yonlendirir.

Isterseniz frontend/.env dosyasina su degiskenleri yazabilirsiniz:

```env
VITE_BACKEND_ORIGIN=http://localhost:8000
VITE_API_BASE=/api
```

### 2.3 Frontend'i calistirma

```powershell
npm run dev
```

Uygulama varsayilan olarak http://localhost:5173 adresinde acilir.

## Ilk Kullanim Akisi

1. Backend ve frontend'i ayaga kaldirin.
2. http://localhost:8000/docs uzerinden POST /admin/init ile ilk admin kullanicisini olusturun.
3. Frontend'de /admin sayfasindan giris yapin.
4. Kategori, baslik ve iceriklerinizi olusturun.
5. Public tarafta (/) dokumantasyonu test edin.

## Notlar

- Frontend istekleri gelistirme modunda /api uzerinden Vite proxy ile backend'e yonlenir.
- Yuklenen dosyalar backend tarafinda static olarak sunulur (/static).
- Uygulamada kategori/baslik slug olusturma ve icerik butunlugu icin SQL trigger kurallari vardir (bkz. backend/DDL.sql).
