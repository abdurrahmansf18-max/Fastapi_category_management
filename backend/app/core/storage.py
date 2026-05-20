import uuid
from pathlib import PurePath
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile
from PIL import Image
from app.core.config import settings, ABS_UPLOADS_DIR

def _allowed_mimes() -> set[str]:
    return set(x.strip() for x in settings.ALLOWED_MIME.split(",") if x.strip())

def _allowed_attachment_mimes() -> set[str]:
    return set(x.strip() for x in settings.ALLOWED_ATTACHMENT_MIME.split(",") if x.strip())

class LocalStorage:
    def __init__(self, base_dir: str | None = None, public_base_url: str | None = None):
        # Mutlak klasörü kullan
        self.base_dir = Path(base_dir or ABS_UPLOADS_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.public_base_url = (public_base_url or settings.STATIC_BASE_URL).rstrip("/")
        self.allowed = _allowed_mimes()
        self.allowed_attachments = _allowed_attachment_mimes()
        self.max_bytes = settings.MAX_UPLOAD_BYTES

    async def _read_upload(self, file: UploadFile) -> tuple[list[bytes], int]:
        size = 0
        chunks: list[bytes] = []
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > self.max_bytes:
                raise ValueError("File too large")
            chunks.append(chunk)
        return chunks, size

    async def save_image(
        self,
        file: UploadFile,
        tenant_slug: str | None = None,
        max_total_bytes: int | None = None,
    ) -> Tuple[str, str]:
        if file.content_type not in self.allowed:
            raise ValueError("Unsupported file type")

        chunks, size = await self._read_upload(file)

        base_dir = self.base_dir / tenant_slug if tenant_slug else self.base_dir
        base_dir.mkdir(parents=True, exist_ok=True)
        if max_total_bytes is not None:
            existing = sum(p.stat().st_size for p in base_dir.rglob("*") if p.is_file())
            if existing + size > max_total_bytes:
                raise ValueError("Upload limit reached for this plan")

        ext = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }.get(file.content_type, "")

        fname = f"{uuid.uuid4().hex}{ext}"
        abs_path = base_dir / fname
        with open(abs_path, "wb") as f:
            for ch in chunks:
                f.write(ch)

        # Gerçek görsel mi?
        try:
            with Image.open(abs_path) as im:
                im.verify()
        except Exception:
            abs_path.unlink(missing_ok=True)
            raise ValueError("Invalid image file")

        # Kayıtlara mutlak domain yerine relatif yol yazalım.
        # Böylece dış ortam (ngrok, prod) altında doğru domain ile servis edilir.
        public_url = (
            f"{settings.STATIC_MOUNT_PATH}/{tenant_slug}/{fname}"
            if tenant_slug
            else f"{settings.STATIC_MOUNT_PATH}/{fname}"
        )
        return str(abs_path), public_url

    async def save_file(
        self,
        file: UploadFile,
        tenant_slug: str | None = None,
        max_total_bytes: int | None = None,
    ) -> Tuple[str, str, int, str, str]:
        if file.content_type not in self.allowed_attachments:
            raise ValueError("Unsupported attachment type")

        chunks, size = await self._read_upload(file)

        base_dir = self.base_dir / tenant_slug if tenant_slug else self.base_dir
        base_dir.mkdir(parents=True, exist_ok=True)
        if max_total_bytes is not None:
            existing = sum(p.stat().st_size for p in base_dir.rglob("*") if p.is_file())
            if existing + size > max_total_bytes:
                raise ValueError("Upload limit reached for this plan")

        original_name = (file.filename or "attachment").strip()
        original_name = PurePath(original_name).name
        safe_name = "".join(ch for ch in original_name if ch.isalnum() or ch in {"-", "_", ".", " "}).strip()
        if not safe_name:
            safe_name = "attachment"
        ext = Path(safe_name).suffix.lower()
        fname = f"{uuid.uuid4().hex}{ext}"
        abs_path = base_dir / fname

        with open(abs_path, "wb") as f:
            for ch in chunks:
                f.write(ch)

        public_url = (
            f"{settings.STATIC_MOUNT_PATH}/{tenant_slug}/{fname}"
            if tenant_slug
            else f"{settings.STATIC_MOUNT_PATH}/{fname}"
        )
        return str(abs_path), public_url, size, (file.content_type or "application/octet-stream"), safe_name
