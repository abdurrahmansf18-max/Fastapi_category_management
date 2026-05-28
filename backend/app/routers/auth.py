from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, HTTPException, Query, Request, Response
from app.core.observability import get_logger

logger = get_logger()
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy import text

from app.core.config import ALGORITHM, SECRET_KEY, settings
from app.core.audit import log_audit_event
from app.core.csrf import issue_csrf_token, set_admin_auth_cookies
from app.core.email import send_password_reset_email, send_verification_email, smtp_configured
from app.core.rate_limit import enforce_rate_limit
from app.core.security import create_access_token, pwd_context
from app.core.sessions import create_admin_session, issue_refresh_token
from app.db.provisioning import provision_tenant_schema, schema_name_for_slug
from app.db.session import engine, platform_execute, platform_fetch_all, platform_fetch_one, quote_ident
from app.schemas import (
    AuthLoginIn,
    AuthLoginOut,
    ForgotPasswordIn,
    ForgotPasswordOut,
    ResetPasswordIn,
    ResetPasswordOut,
    SignupIn,
    SignupOut,
    VerifyEmailIn,
    VerifyEmailOut,
    WorkspaceOption,
    WorkspaceSelectIn,
    WorkspaceSelectOut,
)

auth_router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_workspace_selection_token(user_id: str, email: str) -> str:
    return create_access_token(
        {
            "typ": "workspace_select",
            "uid": user_id,
            "sub": email,
        },
        timedelta(minutes=10),
    )


def _decode_workspace_selection_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid workspace selection token") from exc
    if payload.get("typ") != "workspace_select" or not payload.get("uid"):
        raise HTTPException(status_code=401, detail="Invalid workspace selection token")
    return payload


@auth_router.post("/signup", response_model=SignupOut, status_code=201)
async def signup(payload: SignupIn, request: Request):
    await enforce_rate_limit(request, scope="signup", limit=settings.AUTH_RATE_LIMIT)
    schema_name = schema_name_for_slug(payload.tenant_slug)
    password_hash = pwd_context.hash(payload.password)
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    verification_link = (
        f"{settings.APP_PUBLIC_BASE_URL.rstrip('/')}/verify-email?token={token}"
    )

    try:
        async with engine.begin() as conn:
            user_res = await conn.execute(
                text(
                    """
                    INSERT INTO public.user_account (email, password_hash)
                    VALUES (:email, :password_hash)
                    RETURNING id
                    """
                ),
                {"email": payload.email, "password_hash": password_hash},
            )
            user_id = user_res.mappings().first()["id"]

            tenant_res = await conn.execute(
                text(
                    """
                    INSERT INTO public.tenant (owner_user_id, name, slug, schema_name, plan_code)
                    VALUES (:owner_user_id, :name, :slug, :schema_name, 'free')
                    RETURNING id
                    """
                ),
                {
                    "owner_user_id": user_id,
                    "name": payload.workspace_name,
                    "slug": payload.tenant_slug,
                    "schema_name": schema_name,
                },
            )
            tenant_id = tenant_res.mappings().first()["id"]

            await conn.execute(
                text(
                    """
                    INSERT INTO public.email_verification_token (
                      user_id, tenant_id, token_hash, expires_at
                    )
                    VALUES (:user_id, :tenant_id, :token_hash, :expires_at)
                    """
                ),
                {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "token_hash": token_hash,
                    "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
                },
            )
    except IntegrityError as exc:
        await log_audit_event(
            action="auth.signup_conflict",
            request=request,
            metadata={"email": payload.email, "tenant_slug": payload.tenant_slug},
        )
        raise HTTPException(
            status_code=409,
            detail="Email or workspace slug already exists",
        ) from exc

    try:
        send_verification_email(payload.email, verification_link)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "email.verification.send_failed",
            extra={"props": {"to_email": payload.email, "error": str(exc), "verification_link": verification_link}},
        )
    await log_audit_event(
        action="auth.signup_created",
        request=request,
        metadata={"email": payload.email, "tenant_slug": payload.tenant_slug},
    )
    return {
        "message": "Verification email sent",
        "tenant_slug": payload.tenant_slug,
        "verification_link": verification_link,
        "dev_verification_token": None if smtp_configured() else token,
    }


@auth_router.post("/verify-email", response_model=VerifyEmailOut)
async def verify_email(payload: VerifyEmailIn, request: Request):
    await enforce_rate_limit(request, scope="verify-email", limit=settings.AUTH_RATE_LIMIT)
    token_hash = _hash_token(payload.token)
    row = await platform_fetch_one(
        """
        SELECT
          evt.id AS token_id,
          evt.expires_at,
          evt.consumed_at,
          ua.id AS user_id,
          t.id AS tenant_id,
          t.slug,
          t.name,
          t.schema_name,
          t.status
        FROM public.email_verification_token evt
        JOIN public.user_account ua ON ua.id = evt.user_id
        JOIN public.tenant t ON t.id = evt.tenant_id
        WHERE evt.token_hash = :token_hash
        """,
        {"token_hash": token_hash},
    )
    if not row or row["consumed_at"] is not None or row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if row["status"] != "active":
        await provision_tenant_schema(row["schema_name"], row["name"])
        await platform_execute(
            """
            UPDATE public.user_account
            SET email_verified = true
            WHERE id = :user_id
            """,
            {"user_id": row["user_id"]},
        )
        await log_audit_event(
            action="auth.email_verified",
            actor_user_id=str(row["user_id"]),
            tenant_id=str(row["tenant_id"]),
            request=request,
            metadata={"tenant_slug": row["slug"]},
        )
        await platform_execute(
            """
            UPDATE public.tenant
            SET status = 'active'
            WHERE id = :tenant_id
            """,
            {"tenant_id": row["tenant_id"]},
        )
        await platform_execute(
            """
            INSERT INTO public.tenant_member (tenant_id, user_id, role)
            VALUES (:tenant_id, :user_id, 'owner')
            ON CONFLICT (tenant_id, user_id) DO NOTHING
            """,
            {"tenant_id": row["tenant_id"], "user_id": row["user_id"]},
        )

    await platform_execute(
        """
        UPDATE public.email_verification_token
        SET consumed_at = now()
        WHERE id = :token_id
        """,
        {"token_id": row["token_id"]},
    )
    return {"message": "Email verified", "tenant_slug": row["slug"]}


@auth_router.post("/login", response_model=AuthLoginOut)
async def auth_login(payload: AuthLoginIn, request: Request):
    await enforce_rate_limit(request, scope="auth-login", limit=settings.AUTH_RATE_LIMIT)
    user = await platform_fetch_one(
        """
        SELECT id, email, password_hash, email_verified
        FROM public.user_account
        WHERE email = :email
        """,
        {"email": payload.email},
    )
    if not user or not pwd_context.verify(payload.password, user["password_hash"]):
        await log_audit_event(
            action="auth.login_failed",
            request=request,
            metadata={"email": payload.email},
        )
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if not user["email_verified"]:
        raise HTTPException(status_code=403, detail="Email is not verified")

    workspace_rows = await platform_fetch_all(
        """
        SELECT
          t.id AS tenant_id,
          t.slug AS tenant_slug,
          t.name AS workspace_name,
          tm.role
        FROM public.tenant_member tm
        JOIN public.tenant t ON t.id = tm.tenant_id
        WHERE tm.user_id = :user_id
          AND t.status = 'active'
        ORDER BY t.created_at
        """,
        {"user_id": user["id"]},
    )
    if not workspace_rows:
        raise HTTPException(status_code=403, detail="No active workspace membership found")
    workspaces = [
        WorkspaceOption(
            tenant_id=row["tenant_id"],
            tenant_slug=row["tenant_slug"],
            workspace_name=row["workspace_name"],
            role=row["role"],
        )
        for row in workspace_rows
    ]
    return {
        "message": "Workspace selection required",
        "selection_token": _issue_workspace_selection_token(str(user["id"]), user["email"]),
        "workspaces": workspaces,
    }


@auth_router.post("/select-workspace", response_model=WorkspaceSelectOut)
async def select_workspace(payload: WorkspaceSelectIn, request: Request, response: Response):
    await enforce_rate_limit(request, scope="workspace-select", limit=settings.AUTH_RATE_LIMIT * 2)
    token_payload = _decode_workspace_selection_token(payload.selection_token)
    user_id = token_payload["uid"]
    row = await platform_fetch_one(
        """
        SELECT
          ua.id AS user_id,
          ua.email,
          ua.email_verified,
          t.id AS tenant_id,
          t.slug AS tenant_slug,
          tm.role
        FROM public.user_account ua
        JOIN public.tenant_member tm ON tm.user_id = ua.id
        JOIN public.tenant t ON t.id = tm.tenant_id
        WHERE ua.id = :user_id
          AND t.slug = :tenant_slug
          AND t.status = 'active'
        """,
        {"user_id": uuid.UUID(user_id), "tenant_slug": payload.tenant_slug},
    )
    if not row or not row["email_verified"]:
        await log_audit_event(
            action="auth.workspace_select_failed",
            request=request,
            metadata={"tenant_slug": payload.tenant_slug, "user_id": user_id},
        )
        raise HTTPException(status_code=403, detail="Workspace is not accessible")

    access_token = create_access_token(
        {
            "typ": "admin_access",
            "uid": str(row["user_id"]),
            "user_id": str(row["user_id"]),
            "sub": row["email"],
            "tenant_id": str(row["tenant_id"]),
            "tenant_slug": row["tenant_slug"],
            "role": row["role"],
        }
    )
    csrf_token = issue_csrf_token()
    refresh_token = issue_refresh_token()
    await create_admin_session(
        tenant_id=str(row["tenant_id"]),
        user_id=str(row["user_id"]),
        access_token=access_token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
        request=request,
    )
    set_admin_auth_cookies(
        response,
        row["tenant_slug"],
        access_token,
        refresh_token,
        csrf_token,
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    # Update last login timestamp
    await platform_execute(
        "UPDATE public.user_account SET last_login_at = NOW() WHERE id = :uid",
        {"uid": row["user_id"]},
    )
    await log_audit_event(
        action="auth.workspace_selected",
        actor_user_id=str(row["user_id"]),
        tenant_id=str(row["tenant_id"]),
        request=request,
        metadata={"tenant_slug": row["tenant_slug"]},
    )
    return {
        "access_token": "cookie-session",
        "token_type": "cookie",
        "tenant_slug": row["tenant_slug"],
    }


@auth_router.get("/verification-status")
async def verification_status(tenant_slug: str = Query(..., pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")):
    """Tenant slug'ının doğrulama durumunu kontrol et. (Kamuya açık bilgi)"""
    row = await platform_fetch_one(
        "SELECT status FROM public.tenant WHERE slug = :slug",
        {"slug": tenant_slug},
    )
    return {"verified": bool(row and row["status"] == "active")}


@auth_router.post("/forgot-password", response_model=ForgotPasswordOut)
async def forgot_password(payload: ForgotPasswordIn, request: Request):
    """Şifre sıfırlama bağlantısı gönder. Güvenlik için e-posta kayıtlı olsa da olmasa da aynı yanıtı döner."""
    await enforce_rate_limit(request, scope="forgot-password", limit=5)

    user = await platform_fetch_one(
        "SELECT id, email FROM public.user_account WHERE email = :email",
        {"email": payload.email},
    )

    if user:
        # Önceki kullanılmamış tokenları geçersiz kıl
        await platform_execute(
            "DELETE FROM public.password_reset_token WHERE user_id = :uid AND consumed_at IS NULL",
            {"uid": user["id"]},
        )
        token = secrets.token_urlsafe(32)
        token_hash = _hash_token(token)
        await platform_execute(
            """
            INSERT INTO public.password_reset_token (user_id, token_hash, expires_at)
            VALUES (:uid, :token_hash, :expires_at)
            """,
            {
                "uid": user["id"],
                "token_hash": token_hash,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            },
        )
        reset_link = f"{settings.APP_PUBLIC_BASE_URL.rstrip('/')}/reset-password?token={token}"
        try:
            send_password_reset_email(user["email"], reset_link)
        except Exception as exc:
            logger.warning(
                "email.password_reset.send_failed",
                extra={"props": {"to_email": user["email"], "error": str(exc), "reset_link": reset_link}},
            )
        await log_audit_event(
            action="auth.forgot_password_requested",
            request=request,
            metadata={"email": payload.email},
        )

    # Güvenlik: her zaman aynı yanıt
    return {"message": "If that email is registered, a reset link has been sent."}


@auth_router.post("/reset-password", response_model=ResetPasswordOut)
async def reset_password(payload: ResetPasswordIn, request: Request):
    """Token ile yeni şifre belirle."""
    await enforce_rate_limit(request, scope="reset-password", limit=10)
    token_hash = _hash_token(payload.token)
    row = await platform_fetch_one(
        """
        SELECT prt.id AS token_id, prt.expires_at, prt.consumed_at, prt.user_id
        FROM public.password_reset_token prt
        WHERE prt.token_hash = :token_hash
        """,
        {"token_hash": token_hash},
    )
    if (
        not row
        or row["consumed_at"] is not None
        or row["expires_at"] < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    new_hash = pwd_context.hash(payload.new_password)
    await platform_execute(
        "UPDATE public.user_account SET password_hash = :ph, updated_at = now() WHERE id = :uid",
        {"ph": new_hash, "uid": row["user_id"]},
    )
    await platform_execute(
        "UPDATE public.password_reset_token SET consumed_at = now() WHERE id = :tid",
        {"tid": row["token_id"]},
    )
    await log_audit_event(
        action="auth.password_reset_completed",
        actor_user_id=str(row["user_id"]),
        request=request,
    )
    return {"message": "Password has been reset. You can now log in."}

@auth_router.get("/workspaces/suggest")
async def suggest_workspaces(
    request: Request,
    q: str = Query("", min_length=0, max_length=80),
    limit: int = Query(8, ge=1, le=20),
):
    await enforce_rate_limit(
        request,
        scope="workspace-suggest",
        limit=max(settings.AUTH_RATE_LIMIT * 3, 30),
    )
    needle = q.strip().lower()
    if len(needle) < 1:
        return []

    params = {
        "like_q": f"%{needle}%",
        "prefix_q": f"{needle}%",
        "limit": max(limit * 3, limit),
    }
    try:
        candidates = await platform_fetch_all(
            """
            SELECT slug, name, schema_name
            FROM public.tenant
            WHERE status = 'active'
              AND discoverable = true
              AND (
                slug ILIKE :like_q
                OR name ILIKE :like_q
              )
            ORDER BY
              CASE WHEN slug ILIKE :prefix_q THEN 0 ELSE 1 END,
              slug ASC
            LIMIT :limit
            """,
            params,
        )
    except ProgrammingError:
        # Backward-compatible fallback for environments that have not yet
        # applied the `discoverable` column migration.
        candidates = await platform_fetch_all(
            """
            SELECT slug, name, schema_name
            FROM public.tenant
            WHERE status = 'active'
              AND (
                slug ILIKE :like_q
                OR name ILIKE :like_q
              )
            ORDER BY
              CASE WHEN slug ILIKE :prefix_q THEN 0 ELSE 1 END,
              slug ASC
            LIMIT :limit
            """,
            params,
        )

    visible: list[dict[str, str]] = []
    for row in candidates:
        try:
            schema_name = quote_ident(row["schema_name"])
            has_published = await platform_fetch_one(
                f"""
                SELECT EXISTS (
                  SELECT 1
                  FROM {schema_name}.content
                  WHERE status = 'published'
                  LIMIT 1
                ) AS ok
                """
            )
            if has_published and has_published["ok"]:
                visible.append({"slug": row["slug"], "name": row["name"]})
        except Exception:
            continue
        if len(visible) >= limit:
            break
    return visible
