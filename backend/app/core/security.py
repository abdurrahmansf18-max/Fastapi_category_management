import uuid
import jwt
from datetime import datetime
from datetime import timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Path, Request, WebSocket, status
from passlib.context import CryptContext

from app.core.audit import log_audit_event
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_DELTA
from app.core.csrf import admin_csrf_cookie_name, admin_session_cookie_name, validate_admin_csrf
from app.core.observability import update_request_context
from app.core.sessions import validate_admin_session
from app.db.session import platform_fetch_one

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta]  = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or ACCESS_TOKEN_EXPIRE_DELTA)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(
    request: Request,
    tenant_slug: str = Path(...),
):
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )
    tenant_exc = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Tenant session does not match this workspace",
    )
    token = request.cookies.get(admin_session_cookie_name(tenant_slug))
    if not token:
        raise cred_exc

    await validate_admin_csrf(request, tenant_slug)

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str | None = payload.get("uid") or payload.get("user_id")
        token_tenant_slug: str | None = payload.get("tenant_slug")
        token_type: str | None = payload.get("typ")
        if uid is None or token_type not in {None, "admin_access"}:
            raise cred_exc
        if token_tenant_slug != tenant_slug:
            await log_audit_event(
                action="security.tenant_mismatch",
                request=request,
                metadata={
                    "token_tenant_slug": token_tenant_slug,
                    "request_tenant_slug": tenant_slug,
                },
            )
            raise tenant_exc
    except jwt.PyJWTError:
        raise cred_exc

    row = await platform_fetch_one(
        """
        SELECT
          ua.id,
          ua.email,
          ua.created_at,
          tm.role,
          t.id AS tenant_id,
          t.slug AS tenant_slug
        FROM public.user_account ua
        JOIN public.tenant_member tm ON tm.user_id = ua.id
        JOIN public.tenant t ON t.id = tm.tenant_id
        WHERE ua.id = :id
          AND t.slug = :tenant_slug
          AND t.status = 'active'
          AND ua.email_verified = true
        """,
        {"id": uuid.UUID(uid), "tenant_slug": tenant_slug},
    )
    if not row:
        raise cred_exc
    session = await validate_admin_session(
        tenant_id=str(row["tenant_id"]),
        user_id=str(row["id"]),
        access_token=token,
        csrf_token=request.cookies.get(admin_csrf_cookie_name(tenant_slug)),
    )
    update_request_context(tenant_slug=row["tenant_slug"], user_id=str(row["id"]))
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "role": row["role"],
        "tenant_id": str(row["tenant_id"]),
        "tenant_slug": row["tenant_slug"],
        "session_id": str(session["id"]),
        "impersonated_by": payload.get("impersonated_by"),
        "impersonation_reason": payload.get("impersonation_reason"),
    }


async def get_current_admin_from_websocket(websocket: WebSocket, tenant_slug: str):
    token = websocket.cookies.get(admin_session_cookie_name(tenant_slug))
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str | None = payload.get("uid") or payload.get("user_id")
        token_tenant_slug: str | None = payload.get("tenant_slug")
        token_type: str | None = payload.get("typ")
        if uid is None or token_type not in {None, "admin_access"} or token_tenant_slug != tenant_slug:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant session does not match this workspace")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    row = await platform_fetch_one(
        """
        SELECT
          ua.id,
          ua.email,
          ua.created_at,
          tm.role,
          t.id AS tenant_id,
          t.slug AS tenant_slug
        FROM public.user_account ua
        JOIN public.tenant_member tm ON tm.user_id = ua.id
        JOIN public.tenant t ON t.id = tm.tenant_id
        WHERE ua.id = :id
          AND t.slug = :tenant_slug
          AND t.status = 'active'
          AND ua.email_verified = true
        """,
        {"id": uuid.UUID(uid), "tenant_slug": tenant_slug},
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    session = await validate_admin_session(
        tenant_id=str(row["tenant_id"]),
        user_id=str(row["id"]),
        access_token=token,
        csrf_token=websocket.cookies.get(admin_csrf_cookie_name(tenant_slug)),
    )
    update_request_context(tenant_slug=row["tenant_slug"], user_id=str(row["id"]))
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "role": row["role"],
        "tenant_id": str(row["tenant_id"]),
        "tenant_slug": row["tenant_slug"],
        "session_id": str(session["id"]),
    }
