from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Uygulama konfigürasyonu — tüm değerler env değişkenlerinden okunur.

    Zorunlu alanlar varsayılan değere sahip DEĞİLDİR; production'da env dosyasında
    veya Docker environment bloğunda set edilmelidir. validate_production_config()
    startup'ta ek kontrol çalıştırır.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Runtime ---
    ENVIRONMENT: str = "development"

    # --- Veritabanı ---
    DATABASE_URL: str = "postgresql+asyncpg://postgres:admin@localhost:5432/Documantasion_Sys"

    # --- JWT ---
    SECRET_KEY: str = "supersecretkey123changeit"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # --- CORS ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # --- Uygulama ---
    APP_PUBLIC_BASE_URL: str = "http://localhost:3000"
    API_PUBLIC_PREFIX: str = "/api"
    TRUSTED_HOSTS: List[str] = ["localhost", "127.0.0.1", "*.localhost"]

    # --- Upload ---
    UPLOADS_DIR: str = "uploads"
    STATIC_MOUNT_PATH: str = "/static"
    STATIC_BASE_URL: str = "http://localhost:8000/static"
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_MIME: str = "image/jpeg,image/png,image/webp,image/gif"
    ALLOWED_ATTACHMENT_MIME: str = (
        "application/pdf,text/plain,application/zip,"
        "application/msword,"
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
        "image/jpeg,image/png,image/webp,image/gif"
    )

    # --- E-posta ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_TLS: bool = True

    # --- Cookie / CSRF ---
    COOKIE_SECURE: bool = False  # production'da True olmalı
    COOKIE_SAMESITE: str = "lax"
    ADMIN_SESSION_COOKIE_PREFIX: str = "adm_session"
    ADMIN_REFRESH_COOKIE_PREFIX: str = "adm_refresh"
    ADMIN_CSRF_COOKIE_PREFIX: str = "adm_csrf"
    PLATFORM_SESSION_COOKIE: str = "platform_session"
    PLATFORM_REFRESH_COOKIE: str = "platform_refresh"
    PLATFORM_CSRF_COOKIE: str = "platform_csrf"

    # --- Entegrasyonlar ---
    REDIS_URL: str = "redis://localhost:6379/0"
    # Sentinel modu: "redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379"
    # Boş bırakılırsa REDIS_URL doğrudan kullanılır.
    REDIS_SENTINEL_HOSTS: str = ""
    REDIS_SENTINEL_MASTER: str = "mymaster"
    MEILISEARCH_URL: str = ""
    MEILISEARCH_API_KEY: str = ""

    # --- Iyzico (ileride ödeme entegrasyonu için pasif yardımcı ayarlar) ---
    IYZICO_API_KEY: str = ""
    IYZICO_SECRET_KEY: str = ""
    IYZICO_MERCHANT_ID: str = ""
    IYZICO_BASE_URL: str = "https://api.iyzipay.com"

    # --- Hata İzleme ---
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = ""
    SENTRY_RELEASE: str = ""

    # --- Loglama ---
    LOG_LEVEL: str = "INFO"

    # --- Cache ---
    PUBLIC_CACHE_ETAG_MAX_BYTES: int = 256 * 1024  # 256 KB

    # --- Ops ---
    OPS_STATUS_DIR: str = "/ops-status"
    AUDIT_RETENTION_DAYS: int = 180

    # --- Yedekleme (Restic / R2) ---
    RESTIC_REPOSITORY: str = ""
    RESTIC_PASSWORD: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    # --- Platform Sahibi Bootstrap ---
    PLATFORM_OWNER_EMAIL: str = ""
    PLATFORM_OWNER_PASSWORD: str = ""          # düz metin şifre (hash yoksa kullanılır)
    PLATFORM_OWNER_PASSWORD_HASH: str = ""     # bcrypt hash (varsa önceliklidir)
    PLATFORM_OWNER_TOTP_SECRET: str = ""       # opsiyonel 2FA
    PLATFORM_OWNER_BOOTSTRAP_TOKEN: str = ""

    # --- Rate Limit ---
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    AUTH_RATE_LIMIT: int = 20
    # Güvenilir ters proxy katmanı sayısı (Caddy=1, Cloudflare+Caddy=2 …)
    # X-Forwarded-For başlığından gerçek IP'yi çıkarmak için kullanılır.
    TRUSTED_PROXY_COUNT: int = 1

    # -------------------------------------------------------------------------
    # Computed / derived alanlar
    # -------------------------------------------------------------------------

    @property
    def IS_PRODUCTION(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def ACCESS_TOKEN_EXPIRE_DELTA(self) -> timedelta:
        return timedelta(minutes=self.ACCESS_TOKEN_EXPIRE_MINUTES)

    @property
    def ABS_UPLOADS_DIR(self) -> str:
        # __file__ → .../backend/app/core/config.py → parents[2] = backend kökü
        project_root = Path(__file__).resolve().parents[2]
        return str((project_root / self.UPLOADS_DIR).resolve())

    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------

    @field_validator("API_PUBLIC_PREFIX", mode="before")
    @classmethod
    def strip_trailing_slash(cls, v: str) -> str:
        return (v or "/api").rstrip("/")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Env'den virgüllü string veya list olarak gelebilir."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("TRUSTED_HOSTS", mode="before")
    @classmethod
    def parse_trusted_hosts(cls, v):
        if isinstance(v, str):
            return [h.strip() for h in v.split(",") if h.strip()]
        return v

    @model_validator(mode="after")
    def set_defaults_from_computed(self) -> "Settings":
        """CORS_ORIGINS'e FRONTEND_ORIGIN'i ekle (eğer yoksa)."""
        if self.FRONTEND_ORIGIN and self.FRONTEND_ORIGIN not in self.CORS_ORIGINS:
            # list frozen değil, kopyalayarak ekle
            self.CORS_ORIGINS = [self.FRONTEND_ORIGIN] + list(self.CORS_ORIGINS)
        if not self.SENTRY_ENVIRONMENT:
            self.SENTRY_ENVIRONMENT = self.ENVIRONMENT
        # production'da COOKIE_SECURE varsayılan olarak True
        if self.IS_PRODUCTION and not self.COOKIE_SECURE:
            self.COOKIE_SECURE = True
        return self


# ---------------------------------------------------------------------------
# Singleton — tüm uygulama bu nesneyi kullanır
# ---------------------------------------------------------------------------
settings = Settings()

# ---------------------------------------------------------------------------
# Geriye dönük uyumluluk sabitleri (eski import'ları kırmamak için)
# ---------------------------------------------------------------------------
ENVIRONMENT = settings.ENVIRONMENT
IS_PRODUCTION = settings.IS_PRODUCTION
DATABASE_URL = settings.DATABASE_URL
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
ACCESS_TOKEN_EXPIRE_DELTA = settings.ACCESS_TOKEN_EXPIRE_DELTA
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS
FRONTEND_ORIGIN = settings.FRONTEND_ORIGIN
CORS_ORIGINS = settings.CORS_ORIGINS
APP_TITLE = "Docs Platform API"
APP_VERSION = "1.0.0"
APP_PUBLIC_BASE_URL = settings.APP_PUBLIC_BASE_URL
API_PUBLIC_PREFIX = settings.API_PUBLIC_PREFIX
TRUSTED_HOSTS = settings.TRUSTED_HOSTS
UPLOADS_DIR = settings.UPLOADS_DIR
STATIC_MOUNT_PATH = settings.STATIC_MOUNT_PATH
STATIC_BASE_URL = settings.STATIC_BASE_URL
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_BYTES
ALLOWED_MIME = settings.ALLOWED_MIME
ALLOWED_ATTACHMENT_MIME = settings.ALLOWED_ATTACHMENT_MIME
ABS_UPLOADS_DIR = settings.ABS_UPLOADS_DIR


# ---------------------------------------------------------------------------
# Production başlangıç kontrolü
# ---------------------------------------------------------------------------
def validate_production_config() -> None:
    """Eksik / güvensiz production konfigürasyonlarını startup'ta yakalar.

    IS_PRODUCTION değilse sessizce döner.
    """
    if not settings.IS_PRODUCTION:
        return

    problems: list[str] = []

    if settings.SECRET_KEY in {"supersecretkey123changeit"} or len(settings.SECRET_KEY) < 32:
        problems.append("SECRET_KEY must be set to a strong production secret (≥32 chars)")

    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        problems.append("SMTP_HOST and SMTP_FROM must be configured")

    if settings.APP_PUBLIC_BASE_URL.startswith("http://localhost"):
        problems.append("APP_PUBLIC_BASE_URL must point to the production domain")

    if any(
        origin.startswith(("http://localhost", "http://127.0.0.1"))
        for origin in settings.CORS_ORIGINS
    ):
        problems.append("CORS_ORIGINS must not include localhost in production")

    if not settings.COOKIE_SECURE:
        problems.append("COOKIE_SECURE must be true in production")

    if not settings.MEILISEARCH_URL or not settings.MEILISEARCH_API_KEY:
        problems.append("Meilisearch URL and API key must be configured in production")

    if not settings.SENTRY_DSN:
        problems.append("SENTRY_DSN must be configured in production")

    if not settings.LOG_LEVEL:
        problems.append("LOG_LEVEL must be configured")

    if settings.AUDIT_RETENTION_DAYS < 30:
        problems.append("AUDIT_RETENTION_DAYS must be at least 30")

    if not all(
        [
            settings.RESTIC_REPOSITORY,
            settings.RESTIC_PASSWORD,
            settings.AWS_ACCESS_KEY_ID,
            settings.AWS_SECRET_ACCESS_KEY,
        ]
    ):
        problems.append(
            "Restic and Cloudflare R2 backup credentials must be configured in production"
        )

    if not all(
        [
            settings.PLATFORM_OWNER_EMAIL,
            settings.PLATFORM_OWNER_PASSWORD_HASH,
            settings.PLATFORM_OWNER_TOTP_SECRET,
        ]
    ):
        problems.append(
            "Platform owner email, password hash, and TOTP secret must be configured"
        )

    if problems:
        raise RuntimeError(
            "Production configuration is unsafe:\n  • " + "\n  • ".join(problems)
        )
