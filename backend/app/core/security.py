import uuid
import jwt
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Path, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_DELTA
from app.db.session import platform_fetch_one

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/t/{tenant_slug}/admin/login")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime]  = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or ACCESS_TOKEN_EXPIRE_DELTA)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(
    tenant_slug: str = Path(...),
    token: str = Depends(oauth2_scheme),
):
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid: str | None = payload.get("uid") or payload.get("user_id")
        token_tenant_slug: str | None = payload.get("tenant_slug")
        if uid is None or token_tenant_slug != tenant_slug:
            raise cred_exc
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
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "role": row["role"],
        "tenant_id": str(row["tenant_id"]),
        "tenant_slug": row["tenant_slug"],
    }
