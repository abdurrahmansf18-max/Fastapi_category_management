import os
from datetime import timedelta
from dotenv import load_dotenv
from types import SimpleNamespace
from pathlib import Path

load_dotenv()

# Runtime
ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development")).lower()
IS_PRODUCTION = ENVIRONMENT == "production"

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
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# CORS
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
CORS_ORIGINS = [
    x.strip()
    for x in os.getenv(
        "CORS_ORIGINS",
        ",".join(
            [
                FRONTEND_ORIGIN,
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
        ),
    ).split(",")
    if x.strip()
]

# App info
APP_TITLE = "Docs Platform API"
APP_VERSION = "1.0.0"
APP_PUBLIC_BASE_URL = os.getenv("APP_PUBLIC_BASE_URL", "http://localhost:3000")
API_PUBLIC_PREFIX = os.getenv("API_PUBLIC_PREFIX", "/api").rstrip("/")
TRUSTED_HOSTS = [
    x.strip()
    for x in os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1,*.localhost").split(",")
    if x.strip()
]

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

# Browser session / CSRF
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true" if IS_PRODUCTION else "false").lower() in {
    "1",
    "true",
    "yes",
    "on",
}
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
ADMIN_SESSION_COOKIE_PREFIX = os.getenv("ADMIN_SESSION_COOKIE_PREFIX", "adm_session")
ADMIN_REFRESH_COOKIE_PREFIX = os.getenv("ADMIN_REFRESH_COOKIE_PREFIX", "adm_refresh")
ADMIN_CSRF_COOKIE_PREFIX = os.getenv("ADMIN_CSRF_COOKIE_PREFIX", "adm_csrf")
PLATFORM_SESSION_COOKIE = os.getenv("PLATFORM_SESSION_COOKIE", "platform_session")
PLATFORM_REFRESH_COOKIE = os.getenv("PLATFORM_REFRESH_COOKIE", "platform_refresh")
PLATFORM_CSRF_COOKIE = os.getenv("PLATFORM_CSRF_COOKIE", "platform_csrf")

# Integrations
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
MEILISEARCH_URL = os.getenv("MEILISEARCH_URL", "")
MEILISEARCH_API_KEY = os.getenv("MEILISEARCH_API_KEY", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_PRO = os.getenv("STRIPE_PRICE_PRO", "")
STRIPE_CUSTOMER_PORTAL_RETURN_URL = os.getenv(
    "STRIPE_CUSTOMER_PORTAL_RETURN_URL",
    f"{APP_PUBLIC_BASE_URL.rstrip('/')}/platform/admin",
)
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
PUBLIC_CACHE_ETAG_MAX_BYTES = int(os.getenv("PUBLIC_CACHE_ETAG_MAX_BYTES", str(256 * 1024)))
OPS_STATUS_DIR = os.getenv("OPS_STATUS_DIR", "/ops-status")
RESTIC_REPOSITORY = os.getenv("RESTIC_REPOSITORY", "")
RESTIC_PASSWORD = os.getenv("RESTIC_PASSWORD", "")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")

# Platform owner bootstrap. In production these must be provided and rotated.
PLATFORM_OWNER_EMAIL = os.getenv("PLATFORM_OWNER_EMAIL", "")
PLATFORM_OWNER_PASSWORD_HASH = os.getenv("PLATFORM_OWNER_PASSWORD_HASH", "")
PLATFORM_OWNER_TOTP_SECRET = os.getenv("PLATFORM_OWNER_TOTP_SECRET", "")
PLATFORM_OWNER_BOOTSTRAP_TOKEN = os.getenv("PLATFORM_OWNER_BOOTSTRAP_TOKEN", "")

# Rate limits are per IP/tenant window unless plan-specific limits override them.
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
AUTH_RATE_LIMIT = int(os.getenv("AUTH_RATE_LIMIT", "10"))
PUBLIC_RATE_LIMIT_FREE = int(os.getenv("PUBLIC_RATE_LIMIT_FREE", "120"))
PUBLIC_RATE_LIMIT_PRO = int(os.getenv("PUBLIC_RATE_LIMIT_PRO", "600"))
SEARCH_RATE_LIMIT_FREE = int(os.getenv("SEARCH_RATE_LIMIT_FREE", "60"))
SEARCH_RATE_LIMIT_PRO = int(os.getenv("SEARCH_RATE_LIMIT_PRO", "300"))
ADMIN_RATE_LIMIT_FREE = int(os.getenv("ADMIN_RATE_LIMIT_FREE", "120"))
ADMIN_RATE_LIMIT_PRO = int(os.getenv("ADMIN_RATE_LIMIT_PRO", "600"))


def validate_production_config() -> None:
    if not IS_PRODUCTION:
        return
    problems = []
    if SECRET_KEY == "supersecretkey123changeit" or len(SECRET_KEY) < 32:
        problems.append("SECRET_KEY must be set to a strong production secret")
    if not SMTP_HOST or not SMTP_FROM:
        problems.append("SMTP_HOST and SMTP_FROM must be configured")
    if APP_PUBLIC_BASE_URL.startswith("http://localhost"):
        problems.append("APP_PUBLIC_BASE_URL must point to the production domain")
    if any(origin.startswith(("http://localhost", "http://127.0.0.1")) for origin in CORS_ORIGINS):
        problems.append("CORS_ORIGINS must not include localhost in production")
    if not COOKIE_SECURE:
        problems.append("COOKIE_SECURE must be true in production")
    if not STRIPE_SECRET_KEY or not STRIPE_WEBHOOK_SECRET or not STRIPE_PRICE_PRO:
        problems.append("Stripe secret key, webhook secret, and Pro price must be configured in production")
    if not MEILISEARCH_URL or not MEILISEARCH_API_KEY:
        problems.append("Meilisearch URL and API key must be configured in production")
    if not RESTIC_REPOSITORY or not RESTIC_PASSWORD or not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        problems.append("Restic and Cloudflare R2 backup credentials must be configured in production")
    if not PLATFORM_OWNER_EMAIL or not PLATFORM_OWNER_PASSWORD_HASH or not PLATFORM_OWNER_TOTP_SECRET:
        problems.append("Platform owner email, password hash, and TOTP secret must be configured")
    if problems:
        raise RuntimeError("Production configuration is unsafe: " + "; ".join(problems))

# storage.py ve admin.py burada settings bekliyor
settings = SimpleNamespace(
    ENVIRONMENT=ENVIRONMENT,
    IS_PRODUCTION=IS_PRODUCTION,
    ACCESS_TOKEN_EXPIRE_MINUTES=ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS=REFRESH_TOKEN_EXPIRE_DAYS,
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
    API_PUBLIC_PREFIX=API_PUBLIC_PREFIX,
    TRUSTED_HOSTS=TRUSTED_HOSTS,
    CORS_ORIGINS=CORS_ORIGINS,
    COOKIE_SECURE=COOKIE_SECURE,
    COOKIE_SAMESITE=COOKIE_SAMESITE,
    ADMIN_SESSION_COOKIE_PREFIX=ADMIN_SESSION_COOKIE_PREFIX,
    ADMIN_REFRESH_COOKIE_PREFIX=ADMIN_REFRESH_COOKIE_PREFIX,
    ADMIN_CSRF_COOKIE_PREFIX=ADMIN_CSRF_COOKIE_PREFIX,
    PLATFORM_SESSION_COOKIE=PLATFORM_SESSION_COOKIE,
    PLATFORM_REFRESH_COOKIE=PLATFORM_REFRESH_COOKIE,
    PLATFORM_CSRF_COOKIE=PLATFORM_CSRF_COOKIE,
    REDIS_URL=REDIS_URL,
    MEILISEARCH_URL=MEILISEARCH_URL,
    MEILISEARCH_API_KEY=MEILISEARCH_API_KEY,
    STRIPE_SECRET_KEY=STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO=STRIPE_PRICE_PRO,
    STRIPE_CUSTOMER_PORTAL_RETURN_URL=STRIPE_CUSTOMER_PORTAL_RETURN_URL,
    SENTRY_DSN=SENTRY_DSN,
    PUBLIC_CACHE_ETAG_MAX_BYTES=PUBLIC_CACHE_ETAG_MAX_BYTES,
    OPS_STATUS_DIR=OPS_STATUS_DIR,
    RESTIC_REPOSITORY=RESTIC_REPOSITORY,
    RESTIC_PASSWORD=RESTIC_PASSWORD,
    AWS_ACCESS_KEY_ID=AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY=AWS_SECRET_ACCESS_KEY,
    PLATFORM_OWNER_EMAIL=PLATFORM_OWNER_EMAIL,
    PLATFORM_OWNER_PASSWORD_HASH=PLATFORM_OWNER_PASSWORD_HASH,
    PLATFORM_OWNER_TOTP_SECRET=PLATFORM_OWNER_TOTP_SECRET,
    PLATFORM_OWNER_BOOTSTRAP_TOKEN=PLATFORM_OWNER_BOOTSTRAP_TOKEN,
    RATE_LIMIT_WINDOW_SECONDS=RATE_LIMIT_WINDOW_SECONDS,
    AUTH_RATE_LIMIT=AUTH_RATE_LIMIT,
    PUBLIC_RATE_LIMIT_FREE=PUBLIC_RATE_LIMIT_FREE,
    PUBLIC_RATE_LIMIT_PRO=PUBLIC_RATE_LIMIT_PRO,
    SEARCH_RATE_LIMIT_FREE=SEARCH_RATE_LIMIT_FREE,
    SEARCH_RATE_LIMIT_PRO=SEARCH_RATE_LIMIT_PRO,
    ADMIN_RATE_LIMIT_FREE=ADMIN_RATE_LIMIT_FREE,
    ADMIN_RATE_LIMIT_PRO=ADMIN_RATE_LIMIT_PRO,
)
