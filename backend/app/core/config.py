import os
from datetime import timedelta
from dotenv import load_dotenv
from types import SimpleNamespace
from pathlib import Path

load_dotenv()

# DB
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:admin@localhost:5432/Documantasion_Sys"
)

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123changeit")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
ACCESS_TOKEN_EXPIRE_DELTA = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

# CORS
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# App info
APP_TITLE = "Docs Platform API"
APP_VERSION = "1.0.0"
APP_PUBLIC_BASE_URL = os.getenv("APP_PUBLIC_BASE_URL", "http://localhost:5173")

# Upload ayarları
UPLOADS_DIR = os.getenv("UPLOADS_DIR", "uploads")
STATIC_MOUNT_PATH = os.getenv("STATIC_MOUNT_PATH", "/static")
STATIC_BASE_URL = os.getenv("STATIC_BASE_URL", "http://localhost:8000/static")

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))  # 5MB
# DİKKAT: string kalsın; storage.py split(",") ile parse ediyor
ALLOWED_MIME = os.getenv("ALLOWED_MIME", "image/jpeg,image/png,image/webp,image/gif")

# --- Mutlak path (Windows/göreli yol şaşmalarını önler) ---
# .../backend/app/core/config.py -> ../../ = backend kökü
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ABS_UPLOADS_DIR = str((PROJECT_ROOT / UPLOADS_DIR).resolve())

# Email verification
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() in {"1", "true", "yes", "on"}

# storage.py ve admin.py burada settings bekliyor
settings = SimpleNamespace(
    UPLOADS_DIR=UPLOADS_DIR,
    STATIC_MOUNT_PATH=STATIC_MOUNT_PATH,
    STATIC_BASE_URL=STATIC_BASE_URL,
    MAX_UPLOAD_BYTES=MAX_UPLOAD_BYTES,
    ALLOWED_MIME=ALLOWED_MIME,
    ABS_UPLOADS_DIR=ABS_UPLOADS_DIR,
    APP_PUBLIC_BASE_URL=APP_PUBLIC_BASE_URL,
    SMTP_HOST=SMTP_HOST,
    SMTP_PORT=SMTP_PORT,
    SMTP_USER=SMTP_USER,
    SMTP_PASSWORD=SMTP_PASSWORD,
    SMTP_FROM=SMTP_FROM,
    SMTP_TLS=SMTP_TLS,
)
