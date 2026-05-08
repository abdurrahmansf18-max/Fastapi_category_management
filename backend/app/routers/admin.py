# app/routers/admin.py
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, insert, update, delete, func
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import pwd_context, create_access_token, get_current_admin
from app.core.tenancy import (
    enforce_tenant_limit,
    get_tenant_context,
    require_tenant_context,
)
from app.db.session import fetch_one, fetch_all, execute, platform_execute, platform_fetch_one, platform_fetch_all
from app.db.models import admin_user as t_admin, category as t_category, heading as t_heading, content as t_content, content_image as t_content_image
from app.schemas import (
    TokenOut, AdminInitIn, AdminCreateIn, AdminOut, AdminPasswordIn,
    CategoryCreate, CategoryUpdate, CategoryOut,
    HeadingCreate, HeadingUpdate, HeadingOut,
    ContentCreate, ContentUpdate, ContentOut,
    ContentImageCreate, ContentImageUpdate, ContentImageOut,
    SearchResult,
)
from fastapi import File, UploadFile, Form
from app.core.storage import LocalStorage
from app.core.config import settings
from urllib.parse import urlparse
from pathlib import Path


admin_router = APIRouter(
    prefix="/t/{tenant_slug}/admin",
    tags=["admin"],
    dependencies=[Depends(require_tenant_context)],
)
storage = LocalStorage()  # env'den UPLOADS_DIR + STATIC_BASE_URL alır
# ---- URL helper (absolute for current host) ----
def _abs_url(request: Request, url: str) -> str:
    try:
        if url.startswith("http://") or url.startswith("https://"):
            from urllib.parse import urlparse
            parsed = urlparse(url)
            if parsed.hostname in {"localhost", "127.0.0.1"}:
                base = str(request.base_url).rstrip("/")
                path = parsed.path
                if path.startswith("/static/"):
                    return f"{base}/api{path}"
                return f"{base}{path}"
            return url
    except Exception:
        return url

    base = str(request.base_url).rstrip("/")
    if url.startswith("/static/"):
        return f"{base}/api{url}"
    if not url.startswith("/"):
        url = "/" + url
    return f"{base}{url}"

# ---- Auth & Tenant Members ----
@admin_router.post("/login", response_model=TokenOut)
async def admin_login(
    tenant_slug: str,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    row = await platform_fetch_one(
        """
        SELECT
          ua.id,
          ua.email,
          ua.password_hash,
          ua.email_verified,
          tm.role,
          t.id AS tenant_id,
          t.slug AS tenant_slug
        FROM public.user_account ua
        JOIN public.tenant_member tm ON tm.user_id = ua.id
        JOIN public.tenant t ON t.id = tm.tenant_id
        WHERE ua.email = :email
          AND t.slug = :tenant_slug
          AND t.status = 'active'
        """,
        {"email": form_data.username, "tenant_slug": tenant_slug},
    )
    if not row or not row["email_verified"] or not pwd_context.verify(form_data.password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    token = create_access_token(
        {
            "uid": str(row["id"]),
            "user_id": str(row["id"]),
            "sub": row["email"],
            "tenant_id": str(row["tenant_id"]),
            "tenant_slug": row["tenant_slug"],
            "role": row["role"],
        }
    )
    return {"access_token": token, "token_type": "bearer"}


@admin_router.get("/me", response_model=AdminOut)
async def me(current=Depends(get_current_admin)):
    row = await platform_fetch_one(
        "SELECT id, email, created_at FROM public.user_account WHERE id = :id",
        {"id": uuid.UUID(current["id"])},
    )
    return row


@admin_router.post("/users", response_model=AdminOut, status_code=201)
async def create_admin_user(payload: AdminCreateIn, current=Depends(get_current_admin)):
    if current["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can create admins")
    await enforce_tenant_limit("admins")

    tenant = get_tenant_context()
    phash = pwd_context.hash(payload.password)
    try:
        existing = await platform_fetch_one(
            "SELECT id FROM public.user_account WHERE email = :email",
            {"email": payload.email},
        )
        if existing:
            user_id = existing["id"]
            member = await platform_fetch_one(
                "SELECT tenant_id FROM public.tenant_member WHERE user_id = :user_id",
                {"user_id": user_id},
            )
            if member:
                raise HTTPException(status_code=409, detail="User already belongs to a workspace")
            await platform_execute(
                """
                UPDATE public.user_account
                SET password_hash = :password_hash, email_verified = true
                WHERE id = :user_id
                """,
                {"password_hash": phash, "user_id": user_id},
            )
        else:
            rows = await platform_execute(
                """
                INSERT INTO public.user_account (email, password_hash, email_verified)
                VALUES (:email, :password_hash, true)
                RETURNING id
                """,
                {"email": payload.email, "password_hash": phash},
            )
            user_id = rows[0]["id"]

        await platform_execute(
            """
            INSERT INTO public.tenant_member (tenant_id, user_id, role)
            VALUES (:tenant_id, :user_id, 'admin')
            """,
            {"tenant_id": tenant.id, "user_id": user_id},
        )
    except IntegrityError as e:
        raise HTTPException(status_code=409, detail="Email already exists") from e

    return await platform_fetch_one(
        "SELECT id, email, created_at FROM public.user_account WHERE id = :id",
        {"id": user_id},
    )


@admin_router.get("/users", response_model=List[AdminOut])
async def list_admin_users(_=Depends(get_current_admin)):
    tenant = get_tenant_context()
    return await platform_fetch_all(
        """
        SELECT ua.id, ua.email, ua.created_at
        FROM public.tenant_member tm
        JOIN public.user_account ua ON ua.id = tm.user_id
        WHERE tm.tenant_id = :tenant_id
        ORDER BY ua.created_at
        """,
        {"tenant_id": tenant.id},
    )


@admin_router.delete("/users/{admin_id}", status_code=204)
async def delete_admin_user(admin_id: uuid.UUID, current=Depends(get_current_admin)):
    if current["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can delete admins")
    if str(admin_id) == current["id"]:
        raise HTTPException(status_code=400, detail="Owner cannot delete itself")

    tenant = get_tenant_context()
    member = await platform_fetch_one(
        """
        SELECT role FROM public.tenant_member
        WHERE tenant_id = :tenant_id AND user_id = :user_id
        """,
        {"tenant_id": tenant.id, "user_id": admin_id},
    )
    if not member:
        raise HTTPException(404, "Admin not found")
    if member["role"] == "owner":
        raise HTTPException(status_code=400, detail="Owner cannot be deleted")

    await platform_execute(
        """
        DELETE FROM public.tenant_member
        WHERE tenant_id = :tenant_id AND user_id = :user_id
        """,
        {"tenant_id": tenant.id, "user_id": admin_id},
    )
    return


@admin_router.patch("/users/{admin_id}/password", status_code=204)
async def change_admin_password(admin_id: uuid.UUID, p: AdminPasswordIn, current=Depends(get_current_admin)):
    if current["role"] != "owner" and str(admin_id) != current["id"]:
        raise HTTPException(status_code=403, detail="Not allowed to change this password")

    tenant = get_tenant_context()
    member = await platform_fetch_one(
        """
        SELECT 1 FROM public.tenant_member
        WHERE tenant_id = :tenant_id AND user_id = :user_id
        """,
        {"tenant_id": tenant.id, "user_id": admin_id},
    )
    if not member:
        raise HTTPException(404, "Admin not found")

    phash = pwd_context.hash(p.password)
    await platform_execute(
        """
        UPDATE public.user_account
        SET password_hash = :password_hash
        WHERE id = :user_id
        """,
        {"password_hash": phash, "user_id": admin_id},
    )
    return

# ---- Category CRUD ----
@admin_router.post("/categories", response_model=CategoryOut)
async def create_category(payload: CategoryCreate, _=Depends(get_current_admin)):
    await enforce_tenant_limit("categories")
    try:
        stmt = (
            insert(t_category)
            .values(name=payload.name, description=payload.description, sort_order=payload.sort_order or 0)
            .returning(
                t_category.c.id, t_category.c.name, t_category.c.slug, t_category.c.description,
                t_category.c.sort_order, t_category.c.created_at, t_category.c.updated_at
            )
        )
        rows = await execute(stmt)
        return rows[0]
    except IntegrityError:
        # Aynı isim/slug için benzersiz kısıt hatasını kullanıcıya anlaşılır şekilde ilet
        raise HTTPException(status_code=409, detail="Bu isimde bir kategori zaten var")

@admin_router.get("/categories", response_model=List[CategoryOut])
async def list_categories(_=Depends(get_current_admin)):
    stmt = (
        select(
            t_category.c.id, t_category.c.name, t_category.c.slug, t_category.c.description,
            t_category.c.sort_order, t_category.c.created_at, t_category.c.updated_at
        )
        .order_by(t_category.c.sort_order, t_category.c.name)
    )
    return await fetch_all(stmt)

@admin_router.get("/categories/{id}", response_model=CategoryOut)
async def get_category(id: uuid.UUID, _=Depends(get_current_admin)):
    stmt = (
        select(
            t_category.c.id, t_category.c.name, t_category.c.slug, t_category.c.description,
            t_category.c.sort_order, t_category.c.created_at, t_category.c.updated_at
        )
        .where(t_category.c.id == id)
    )
    row = await fetch_one(stmt)
    if not row:
        raise HTTPException(404, "Category not found")
    return row

@admin_router.put("/categories/{id}", response_model=CategoryOut)
async def update_category(id: uuid.UUID, payload: CategoryUpdate, _=Depends(get_current_admin)):
    data = payload.model_dump(exclude_unset=True)
    stmt = (
        update(t_category)
        .where(t_category.c.id == id)
        .values(**data)
        .returning(
            t_category.c.id, t_category.c.name, t_category.c.slug, t_category.c.description,
            t_category.c.sort_order, t_category.c.created_at, t_category.c.updated_at
        )
    )
    rows = await execute(stmt)
    if not rows:
        raise HTTPException(404, "Category not found")
    return rows[0]

@admin_router.delete("/categories/{id}", status_code=204)
async def delete_category(id: uuid.UUID, _=Depends(get_current_admin)):
    stmt = delete(t_category).where(t_category.c.id == id).returning(t_category.c.id)
    rows = await execute(stmt)
    if not rows:
        raise HTTPException(404, "Category not found")
    return

# ---- Heading CRUD ----
@admin_router.post("/headings", response_model=HeadingOut)
async def create_heading(payload: HeadingCreate, _=Depends(get_current_admin)):
    await enforce_tenant_limit("headings")
    stmt = (
        insert(t_heading)
        .values(
            level=payload.level,
            category_id=payload.category_id,
            parent_heading_id=payload.parent_heading_id,
            title=payload.title,
            description=payload.description,
            sort_order=payload.sort_order or 0,
        )
        .returning(
            t_heading.c.id, t_heading.c.level, t_heading.c.category_id, t_heading.c.parent_heading_id,
            t_heading.c.title, t_heading.c.slug, t_heading.c.description, t_heading.c.sort_order,
            t_heading.c.created_at, t_heading.c.updated_at
        )
    )
    rows = await execute(stmt)
    return rows[0]

@admin_router.get("/headings", response_model=List[HeadingOut])
async def list_headings(
    level: Optional[int] = Query(None),
    category_id: Optional[uuid.UUID] = Query(None),
    parent_heading_id: Optional[uuid.UUID] = Query(None),
    _=Depends(get_current_admin),
):
    stmt = select(
        t_heading.c.id, t_heading.c.level, t_heading.c.category_id, t_heading.c.parent_heading_id,
        t_heading.c.title, t_heading.c.slug, t_heading.c.description, t_heading.c.sort_order,
        t_heading.c.created_at, t_heading.c.updated_at
    )

    # Dinamik filtreler
    conditions = []
    if level is not None:
        conditions.append(t_heading.c.level == level)
    if category_id is not None:
        conditions.append(t_heading.c.category_id == category_id)
    if parent_heading_id is not None:
        conditions.append(t_heading.c.parent_heading_id == parent_heading_id)
    if conditions:
        stmt = stmt.where(*conditions)

    stmt = stmt.order_by(t_heading.c.sort_order, t_heading.c.title)
    return await fetch_all(stmt)

@admin_router.get("/headings/{id}", response_model=HeadingOut)
async def get_heading(id: uuid.UUID, _=Depends(get_current_admin)):
    stmt = select(
        t_heading.c.id, t_heading.c.level, t_heading.c.category_id, t_heading.c.parent_heading_id,
        t_heading.c.title, t_heading.c.slug, t_heading.c.description, t_heading.c.sort_order,
        t_heading.c.created_at, t_heading.c.updated_at
    ).where(t_heading.c.id == id)
    row = await fetch_one(stmt)
    if not row:
        raise HTTPException(404, "Heading not found")
    return row

@admin_router.put("/headings/{id}", response_model=HeadingOut)
async def update_heading(id: uuid.UUID, payload: HeadingUpdate, _=Depends(get_current_admin)):
    data = payload.model_dump(exclude_unset=True)
    stmt = (
        update(t_heading)
        .where(t_heading.c.id == id)
        .values(**data)
        .returning(
            t_heading.c.id, t_heading.c.level, t_heading.c.category_id, t_heading.c.parent_heading_id,
            t_heading.c.title, t_heading.c.slug, t_heading.c.description, t_heading.c.sort_order,
            t_heading.c.created_at, t_heading.c.updated_at
        )
    )
    rows = await execute(stmt)
    if not rows:
        raise HTTPException(404, "Heading not found")
    return rows[0]

@admin_router.delete("/headings/{id}", status_code=204)
async def delete_heading(id: uuid.UUID, _=Depends(get_current_admin)):
    stmt = delete(t_heading).where(t_heading.c.id == id).returning(t_heading.c.id)
    rows = await execute(stmt)
    if not rows:
        raise HTTPException(404, "Heading not found")
    return

# ---- Content CRUD ----
@admin_router.post("/contents", response_model=ContentOut)
async def create_content(payload: ContentCreate, _=Depends(get_current_admin)):
    await enforce_tenant_limit("contents")
    # heading başına tek içerik kuralı - var mı?
    stmt_exists = select(t_content.c.id).where(t_content.c.heading_id == payload.heading_id)
    exists = await fetch_one(stmt_exists)
    if exists:
        raise HTTPException(status_code=409, detail="This heading already has content.")

    stmt = (
        insert(t_content)
        .values(heading_id=payload.heading_id, body=payload.body, description=payload.description)
        .returning(
            t_content.c.id, t_content.c.heading_id, t_content.c.body, t_content.c.description,
            t_content.c.created_at, t_content.c.updated_at
        )
    )
    rows = await execute(stmt)
    return rows[0]

@admin_router.get("/contents", response_model=List[ContentOut])
async def list_contents(heading_id: Optional[uuid.UUID] = Query(None), _=Depends(get_current_admin)):
    stmt = select(
        t_content.c.id, t_content.c.heading_id, t_content.c.body, t_content.c.description,
        t_content.c.created_at, t_content.c.updated_at
    )
    if heading_id:
        stmt = stmt.where(t_content.c.heading_id == heading_id)
    stmt = stmt.order_by(t_content.c.created_at.desc())
    return await fetch_all(stmt)

@admin_router.get("/contents/{id}", response_model=ContentOut)
async def get_content(id: uuid.UUID, _=Depends(get_current_admin)):
    stmt = select(
        t_content.c.id, t_content.c.heading_id, t_content.c.body, t_content.c.description,
        t_content.c.created_at, t_content.c.updated_at
    ).where(t_content.c.id == id)
    row = await fetch_one(stmt)
    if not row:
        raise HTTPException(404, "Content not found")
    return row

@admin_router.put("/contents/{id}", response_model=ContentOut)
async def update_content(id: uuid.UUID, payload: ContentUpdate, _=Depends(get_current_admin)):
    data = payload.model_dump(exclude_unset=True)
    stmt = (
        update(t_content)
        .where(t_content.c.id == id)
        .values(**data)
        .returning(
            t_content.c.id, t_content.c.heading_id, t_content.c.body, t_content.c.description,
            t_content.c.created_at, t_content.c.updated_at
        )
    )
    rows = await execute(stmt)
    if not rows:
        raise HTTPException(404, "Content not found")
    return rows[0]

@admin_router.delete("/contents/{id}", status_code=204)
async def delete_content(id: uuid.UUID, _=Depends(get_current_admin)):
    stmt = delete(t_content).where(t_content.c.id == id).returning(t_content.c.id)
    rows = await execute(stmt)
    if not rows:
        raise HTTPException(404, "Content not found")
    return

# ---- Content Image CRUD ----
@admin_router.post("/content-images", response_model=ContentImageOut)
async def create_content_image(payload: ContentImageCreate, _=Depends(get_current_admin)):
    stmt = (
        insert(t_content_image)
        .values(
            content_id=payload.content_id,
            url=payload.url,
            alt=payload.alt or "",
            sort_order=payload.sort_order or 0,
            width=payload.width or 0,
            height=payload.height or 0,
        )
        .returning(
            t_content_image.c.id,
            t_content_image.c.content_id,
            t_content_image.c.url,
            t_content_image.c.alt,
            t_content_image.c.sort_order,
            t_content_image.c.width,
            t_content_image.c.height,
            t_content_image.c.created_at,
            t_content_image.c.updated_at,
        )
    )
    rows = await execute(stmt)
    return rows[0]

@admin_router.get("/content-images", response_model=List[ContentImageOut])
async def list_content_images(
    request: Request,
    content_id: Optional[uuid.UUID] = Query(None),
    _=Depends(get_current_admin),
):
    stmt = select(
        t_content_image.c.id, t_content_image.c.content_id, t_content_image.c.url,
        t_content_image.c.alt, t_content_image.c.sort_order,
        t_content_image.c.width, t_content_image.c.height,
        t_content_image.c.created_at, t_content_image.c.updated_at
    )
    if content_id:
        stmt = stmt.where(t_content_image.c.content_id == content_id)
    stmt = stmt.order_by(t_content_image.c.sort_order, t_content_image.c.created_at)
    rows = await fetch_all(stmt)
    # Görseller admin panelinde doğru domain ile görünsün
    result = []
    for r in rows:
        d = dict(r)
        if d.get("url"):
            d["url"] = _abs_url(request, d["url"]) 
        result.append(d)
    return result

@admin_router.get("/content-images/{id}", response_model=ContentImageOut)
async def get_content_image(id: uuid.UUID, request: Request, _=Depends(get_current_admin)):
    stmt = select(
        t_content_image.c.id, t_content_image.c.content_id, t_content_image.c.url,
        t_content_image.c.alt, t_content_image.c.sort_order,
        t_content_image.c.width, t_content_image.c.height,
        t_content_image.c.created_at, t_content_image.c.updated_at
    ).where(t_content_image.c.id == id)
    row = await fetch_one(stmt)
    if not row:
        raise HTTPException(404, "Content image not found")
    d = dict(row)
    if d.get("url"):
        d["url"] = _abs_url(request, d["url"]) 
    return d

@admin_router.put("/content-images/{id}", response_model=ContentImageOut)
async def update_content_image(id: uuid.UUID, payload: ContentImageUpdate, _=Depends(get_current_admin)):
    data = payload.model_dump(exclude_unset=True)
    stmt = (
        update(t_content_image)
        .where(t_content_image.c.id == id)
        .values(**data)
        .returning(
            t_content_image.c.id, t_content_image.c.content_id, t_content_image.c.url,
            t_content_image.c.alt, t_content_image.c.sort_order,
            t_content_image.c.width, t_content_image.c.height,
            t_content_image.c.created_at, t_content_image.c.updated_at
        )
    )
    rows = await execute(stmt)
    if not rows:
        raise HTTPException(404, "Content image not found")
    return rows[0]

@admin_router.post("/content-images/upload", response_model=ContentImageOut, status_code=201)
async def upload_content_image(
    content_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    alt: Optional[str] = Form(None),
    sort_order: Optional[int] = Form(0),
    width: Optional[int] = Form(0),    # <-- yeni
    height: Optional[int] = Form(0),   # <-- yeni
    _=Depends(get_current_admin),
):
    tenant = get_tenant_context()
    # (opsiyonel) content_id var mı doğrula
    exists = await fetch_one(select(t_content.c.id).where(t_content.c.id == content_id))
    if not exists:
        raise HTTPException(status_code=404, detail="Content not found")

    try:
        _, public_url = await storage.save_image(
            file,
            tenant_slug=tenant.slug,
            max_total_bytes=tenant.max_upload_bytes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    stmt = (
        insert(t_content_image)
        .values(
            content_id=content_id,
            url=public_url,                 # TAM URL
            alt=alt or "",
            sort_order=sort_order or 0,
            width=width or 0,               # <-- eklendi
            height=height or 0,             # <-- eklendi
        )
        .returning(
            t_content_image.c.id,
            t_content_image.c.content_id,
            t_content_image.c.url,
            t_content_image.c.alt,
            t_content_image.c.sort_order,
            t_content_image.c.width,        # <-- eklendi
            t_content_image.c.height,       # <-- eklendi
            t_content_image.c.created_at,
            t_content_image.c.updated_at,
        )
    )
    rows = await execute(stmt)
    return rows[0]

@admin_router.delete("/content-images/{id}", status_code=204)
async def delete_content_image(id: uuid.UUID, _=Depends(get_current_admin)):
    tenant = get_tenant_context()
    row = await fetch_one(
        select(t_content_image.c.id, t_content_image.c.url).where(t_content_image.c.id == id)
    )
    if not row:
        raise HTTPException(404, "Content image not found")

    del_rows = await execute(
        delete(t_content_image).where(t_content_image.c.id == id).returning(t_content_image.c.id)
    )
    if not del_rows:
        raise HTTPException(404, "Content image not found")

    # URL'den dosya adını al ve uploads'tan sil
    parsed = urlparse(row["url"])
    fname = Path(parsed.path).name
    fpath = Path(settings.ABS_UPLOADS_DIR) / tenant.slug / fname
    try:
        fpath.unlink(missing_ok=True)
    except Exception:
        pass
    return


# ---- Admin Search (TRGM) ----
@admin_router.get("/search", response_model=List[SearchResult])
async def admin_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(50, ge=1, le=200),
    _=Depends(get_current_admin),
):
    # SQL fonksiyonu: Core ile tanımlamak yerine string çağırmak en pratik
    return await fetch_all("SELECT * FROM search_all_trgm(:q, :limit)", {"q": q, "limit": limit})


import os

import os
import google.generativeai as genai
from pydantic import BaseModel

class FormatMarkdownRequest(BaseModel):
    text: str

@admin_router.post("/format-markdown")
async def format_markdown(req: FormatMarkdownRequest, _: dict = Depends(get_current_admin)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on server")
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"""Sen profesyonel bir Markdown formatlayıcısısın. Sana verilen metni zengin Markdown formatına çevir.

Kurallar:
1. Kod parçalarını (```python vb.) aynı şekilde koru.
2. Listeleri (-, 1.) aynı şekilde alt alta koru.
3. Basşlıkları (#) uygun şekilde koru.
4. Paragrafları bozma, satır arası boşluk Koy.
5. Sadece Markdown kodunu döndür, baştaki ve sondaki açıklayıcımarkdown ibarelerini alma.

Metin:
{req.text}"""
        response = model.generate_content(prompt)
        text = response.text
        if text.startswith("```markdown") and text.endswith("```"):
            text = text[11:-3].strip()
        elif text.startswith("```") and text.endswith("```"):
            text = text[3:-3].strip()
        return {"markdown": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ---- Site Settings ----
from app.schemas import SiteSettingsUpdate

@admin_router.put("/settings")
async def update_site_settings(payload: SiteSettingsUpdate, _=Depends(get_current_admin)):
    if payload.site_title is not None:
        await execute("INSERT INTO site_setting (key, value) VALUES ('site_title', :val) ON CONFLICT (key) DO UPDATE SET value = :val", {"val": payload.site_title})
    if payload.site_logo is not None:
        await execute("INSERT INTO site_setting (key, value) VALUES ('site_logo', :val) ON CONFLICT (key) DO UPDATE SET value = :val", {"val": payload.site_logo})
    return {"message": "Settings updated"}

@admin_router.post("/settings/logo")
async def upload_site_logo(request: Request, file: UploadFile = File(...), _=Depends(get_current_admin)):
    tenant = get_tenant_context()
    try:
        _, public_url = await storage.save_image(
            file,
            tenant_slug=tenant.slug,
            max_total_bytes=tenant.max_upload_bytes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    abs_url = _abs_url(request, public_url)
    await execute("INSERT INTO site_setting (key, value) VALUES ('site_logo', :val) ON CONFLICT (key) DO UPDATE SET value = :val", {"val": abs_url})
    return {"site_logo": abs_url}
