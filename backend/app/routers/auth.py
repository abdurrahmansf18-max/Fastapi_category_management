from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text

from app.core.config import settings
from app.core.audit import log_audit_event
from app.core.email import send_verification_email, smtp_configured
from app.core.rate_limit import enforce_rate_limit
from app.core.security import pwd_context
from app.db.provisioning import provision_tenant_schema, schema_name_for_slug
from app.db.session import engine, platform_execute, platform_fetch_one
from app.schemas import SignupIn, SignupOut, VerifyEmailIn, VerifyEmailOut

auth_router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


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

    send_verification_email(payload.email, verification_link)
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
        await provision_tenant_schema(row["schema_name"])
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
