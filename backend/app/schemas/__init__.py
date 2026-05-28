import uuid
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, model_validator

# ---- Auth/Admin ----
class TokenOut(BaseModel):
    access_token: str
    token_type: str = "cookie"

class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    workspace_name: str = Field(min_length=2, max_length=120)
    tenant_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", min_length=2, max_length=63)

class SignupOut(BaseModel):
    message: str
    tenant_slug: str
    verification_link: str
    dev_verification_token: Optional[str] = None

class VerifyEmailIn(BaseModel):
    token: str = Field(min_length=20)

class VerifyEmailOut(BaseModel):
    message: str
    tenant_slug: str

class AuthLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)

class WorkspaceOption(BaseModel):
    tenant_id: UUID
    tenant_slug: str
    workspace_name: str
    role: str

class AuthLoginOut(BaseModel):
    message: str
    selection_token: str
    workspaces: list[WorkspaceOption]

class WorkspaceSelectIn(BaseModel):
    selection_token: str = Field(min_length=20)
    tenant_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", min_length=2, max_length=63)

class WorkspaceSelectOut(TokenOut):
    tenant_slug: str

class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ForgotPasswordOut(BaseModel):
    message: str

class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=20)
    new_password: str = Field(min_length=8, max_length=200)

class ResetPasswordOut(BaseModel):
    message: str

class AdminInitIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)

class AdminCreateIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)

class AdminOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    created_at: datetime

class AdminPasswordIn(BaseModel):
    password: str = Field(min_length=8, max_length=200)

# ---- Category ----
class CategoryBase(BaseModel):
    name: Optional[str] = Field(default=None, max_length=60)
    description: Optional[str] = Field(default=None, max_length=200)
    seo_description: Optional[str] = Field(default=None, max_length=320)
    sort_order: Optional[int] = 0  # CREATE için default

class CategoryCreate(CategoryBase):
    name: str = Field(min_length=1, max_length=60)

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    seo_description: Optional[str] = None
    sort_order: Optional[int] = None  # UPDATE'te None

class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    seo_description: Optional[str]
    sort_order: int
    created_at: datetime
    updated_at: datetime

# ---- Heading ----
class HeadingBase(BaseModel):
    level: Optional[int] = None  # 1 or 2
    category_id: Optional[uuid.UUID] = None
    parent_heading_id: Optional[uuid.UUID] = None
    title: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, max_length=200)
    seo_description: Optional[str] = Field(default=None, max_length=320)
    sort_order: Optional[int] = 0

class HeadingCreate(HeadingBase):
    level: int
    title: str = Field(min_length=1, max_length=80)

    @model_validator(mode="after")
    def validate_scope(self):
        if self.level not in (1, 2):
            raise ValueError("level 1 veya 2 olmalı")
        if self.level == 1:
            if self.category_id is None:
                raise ValueError("level=1 için category_id zorunlu")
            if self.parent_heading_id is not None:
                raise ValueError("level=1 için parent_heading_id gönderme")
        if self.level == 2:
            if self.parent_heading_id is None:
                raise ValueError("level=2 için parent_heading_id zorunlu")
            if self.category_id is not None:
                raise ValueError("level=2 için category_id gönderme")
        return self

class HeadingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    seo_description: Optional[str] = None
    sort_order: Optional[int] = None  # UPDATE'te None

class HeadingOut(BaseModel):
    id: uuid.UUID
    level: int
    category_id: Optional[uuid.UUID]
    parent_heading_id: Optional[uuid.UUID]
    title: str
    slug: str
    description: Optional[str]
    seo_description: Optional[str]
    sort_order: int
    created_at: datetime
    updated_at: datetime

# ---- Content ----
class ContentBase(BaseModel):
    heading_id: Optional[uuid.UUID] = None
    body: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=320)
    status: Optional[str] = Field(default="published", pattern="^(draft|published)$")

class ContentCreate(ContentBase):
    heading_id: uuid.UUID
    body: str

class ContentUpdate(ContentBase):
    body: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(draft|published)$")

class ContentOut(BaseModel):
    id: uuid.UUID
    heading_id: uuid.UUID
    body: str
    description: Optional[str]
    status: str = "published"
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

# ---- Content Image ----
class ContentImageBase(BaseModel):
    url: Optional[str] = None
    alt: Optional[str] = ""
    sort_order: Optional[int] = 0
    width: Optional[int] = None    # yeni eklendi
    height: Optional[int] = None    # yeni eklendi


class ContentImageCreate(ContentImageBase):
    content_id: uuid.UUID
    url: str


class ContentImageUpdate(BaseModel):
    url: Optional[str] = None
    alt: Optional[str] = None
    sort_order: Optional[int] = None
    width: Optional[int] = None     # yeni eklendi
    height: Optional[int] = None    # yeni eklendi


class ContentImageOut(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    url: str
    alt: str
    sort_order: int
    width: Optional[int] = 300
    height: Optional[int] = 200                   # yeni eklendi
    created_at: datetime
    updated_at: datetime


class ContentAttachmentBase(BaseModel):
    url: Optional[str] = None
    label: Optional[str] = Field(default="", max_length=120)
    file_name: Optional[str] = Field(default="attachment", max_length=255)
    mime_type: Optional[str] = Field(default="application/octet-stream", max_length=120)
    size_bytes: Optional[int] = Field(default=0, ge=0)
    sort_order: Optional[int] = 0


class ContentAttachmentCreate(ContentAttachmentBase):
    content_id: uuid.UUID
    url: str


class ContentAttachmentUpdate(BaseModel):
    url: Optional[str] = None
    label: Optional[str] = Field(default=None, max_length=120)
    file_name: Optional[str] = Field(default=None, max_length=255)
    mime_type: Optional[str] = Field(default=None, max_length=120)
    size_bytes: Optional[int] = Field(default=None, ge=0)
    sort_order: Optional[int] = None


class ContentAttachmentOut(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    url: str
    label: str
    file_name: str
    mime_type: str
    size_bytes: int
    sort_order: int
    created_at: datetime
    updated_at: datetime


# ---- Public/View ----
class ContentPublic(BaseModel):
    id: UUID
    heading_id: UUID
    body: str
    description: Optional[str] = None

class CategoryPublic(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    sort_order: int

class HeadingPublic(BaseModel):
    id: uuid.UUID
    level: int
    title: str
    slug: str
    sort_order: int

class PageOut(BaseModel):
    content_id: UUID
    category: str
    h1: str
    h2: str
    title: str
    body: str
    description: Optional[str] = None

from pydantic import Field as PydField

class MenuNode(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    sort_order: int
    children: List["MenuNode"] = PydField(default_factory=list)

MenuNode.model_rebuild()

# ---- Search ----
class SearchResult(BaseModel):
    source: str
    id: uuid.UUID
    label: Optional[str] = None
    snippet: Optional[str] = None
    score: float

class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    total_count: int


class RedirectRuleBase(BaseModel):
    source_path: Optional[str] = Field(default=None, min_length=1, max_length=400, pattern=r"^/.*")
    target_path: Optional[str] = Field(default=None, min_length=1, max_length=400, pattern=r"^/.*")
    status_code: Optional[int] = Field(default=301, ge=301, le=302)
    is_active: Optional[bool] = True
    note: Optional[str] = Field(default=None, max_length=300)


class RedirectRuleCreate(RedirectRuleBase):
    source_path: str = Field(min_length=1, max_length=400, pattern=r"^/.*")
    target_path: str = Field(min_length=1, max_length=400, pattern=r"^/.*")


class RedirectRuleUpdate(BaseModel):
    source_path: Optional[str] = Field(default=None, min_length=1, max_length=400, pattern=r"^/.*")
    target_path: Optional[str] = Field(default=None, min_length=1, max_length=400, pattern=r"^/.*")
    status_code: Optional[int] = Field(default=None, ge=301, le=302)
    is_active: Optional[bool] = None
    note: Optional[str] = Field(default=None, max_length=300)


class RedirectRuleOut(BaseModel):
    id: uuid.UUID
    source_path: str
    target_path: str
    status_code: int
    is_active: bool
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
# ---- Site Settings ----
class SiteSettings(BaseModel):
    site_title: str
    site_logo: str

class SiteSettingsUpdate(BaseModel):
    site_title: Optional[str] = None
    site_logo: Optional[str] = None
