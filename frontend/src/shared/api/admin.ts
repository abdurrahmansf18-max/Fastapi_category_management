// frontend/src/shared/api/admin.ts
import { http } from "./client";
import type {
  AdminUser,
  Category,
  Heading,
  Content,
  ContentImage,
  ContentAttachment,
  RedirectRule,
} from "../types/models";

// --- Auth ---
export const AdminAuth = {
  me: () => http.get<AdminUser>("/admin/me"),
  logout: () => http.post<void>("/admin/logout", undefined),
};

// --- Admin Users ---
export const AdminUsersApi = {
  list: () => http.get<AdminUser[]>("/admin/users"),
  create: (email: string, password: string) =>
    http.post<AdminUser>("/admin/users", { email, password }),
  remove: (id: string) => http.delete<void>(`/admin/users/${id}`),
  changePw: (id: string, password: string) =>
    http.patch<void>(`/admin/users/${id}/password`, { password }),
};

// --- Categories ---
export const CategoriesApi = {
  list: () => http.get<Category[]>("/admin/categories"),
  get: (id: string) => http.get<Category>(`/admin/categories/${id}`),
  create: (payload: {
    name: string;
    description?: string | null;
    seo_description?: string | null;
    sort_order?: number;
  }) => http.post<Category>("/admin/categories", payload),
  update: (
    id: string,
    payload: Partial<{
      name: string;
      description?: string | null;
      seo_description?: string | null;
      sort_order?: number;
    }>
  ) => http.put<Category>(`/admin/categories/${id}`, payload),
  remove: (id: string) => http.delete<void>(`/admin/categories/${id}`),
};

// --- Headings ---
type HeadingCreateL1 = {
  level: 1;
  category_id: string;
  title: string;
  description?: string;
  seo_description?: string;
  sort_order?: number;
};
type HeadingCreateL2 = {
  level: 2;
  parent_heading_id: string;
  title: string;
  description?: string;
  seo_description?: string;
  sort_order?: number;
};
type HeadingUpdate = Partial<{
  title: string;
  description?: string | null;
  seo_description?: string | null;
  sort_order?: number;
}>;

export const HeadingsApi = {
  list(params?: {
    level?: 1 | 2;
    category_id?: string;
    parent_heading_id?: string;
  }) {
    const sp = new URLSearchParams();
    if (params?.level) sp.set("level", String(params.level));
    if (params?.category_id) sp.set("category_id", params.category_id);
    if (params?.parent_heading_id)
      sp.set("parent_heading_id", params.parent_heading_id);
    const q = sp.toString();
    return http.get<Heading[]>(`/admin/headings${q ? `?${q}` : ""}`);
  },
  create(payload: HeadingCreateL1 | HeadingCreateL2) {
    return http.post<Heading>("/admin/headings", payload);
  },
  update(id: string, payload: HeadingUpdate) {
    return http.put<Heading>(`/admin/headings/${id}`, payload);
  },
  remove(id: string) {
    return http.delete<void>(`/admin/headings/${id}`);
  },
};

// --- Contents ---
type ContentCreate = {
  heading_id: string;
  body: string;
  description?: string | null;
  status?: "draft" | "published";
};
type ContentUpdate = Partial<{
  body: string;
  description?: string | null;
  status: "draft" | "published";
}>;

export const ContentsApi = {
  list(heading_id?: string) {
    return heading_id
      ? http.get<Content[]>(`/admin/contents?heading_id=${heading_id}`)
      : http.get<Content[]>("/admin/contents");
  },
  get(id: string) {
    return http.get<Content>(`/admin/contents/${id}`);
  },
  create(payload: ContentCreate) {
    return http.post<Content>("/admin/contents", payload);
  },
  update(id: string, payload: ContentUpdate) {
    return http.put<Content>(`/admin/contents/${id}`, payload);
  },
  remove(id: string) {
    return http.delete<void>(`/admin/contents/${id}`);
  },
};

// --- Content Images ---
type ContentImageCreate = {
  content_id: string;
  url: string;
  alt?: string;
  sort_order?: number;
  width?: number;
  height?: number;
};
type ContentImageUpdate = Partial<{
  url: string;
  alt?: string;
  sort_order?: number;
  width?: number;
  height?: number;
}>;

export const ContentImagesApi = {
  list(content_id?: string) {
    return content_id
      ? http.get<ContentImage[]>(
          `/admin/content-images?content_id=${content_id}`
        )
      : http.get<ContentImage[]>("/admin/content-images");
  },
  get(id: string) {
    return http.get<ContentImage>(`/admin/content-images/${id}`);
  },
  create(payload: ContentImageCreate) {
    return http.post<ContentImage>("/admin/content-images", payload);
  },
  update(id: string, payload: ContentImageUpdate) {
    return http.put<ContentImage>(`/admin/content-images/${id}`, payload);
  },
  remove(id: string) {
    return http.delete<void>(`/admin/content-images/${id}`);
  },
  upload(
    file: File,
    content_id: string,
    alt?: string,
    sort_order?: number,
    width?: number,
    height?: number
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("content_id", content_id);
    if (alt) formData.append("alt", alt);
    if (sort_order !== undefined)
      formData.append("sort_order", sort_order.toString());
    if (width !== undefined) formData.append("width", width.toString());
    if (height !== undefined) formData.append("height", height.toString());

    return http.post<ContentImage>("/admin/content-images/upload", formData);
  },
};

type ContentAttachmentCreate = {
  content_id: string;
  url: string;
  label?: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  sort_order?: number;
};
type ContentAttachmentUpdate = Partial<{
  url: string;
  label?: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  sort_order?: number;
}>;

export const ContentAttachmentsApi = {
  list(content_id?: string) {
    return content_id
      ? http.get<ContentAttachment[]>(`/admin/content-attachments?content_id=${content_id}`)
      : http.get<ContentAttachment[]>("/admin/content-attachments");
  },
  get(id: string) {
    return http.get<ContentAttachment>(`/admin/content-attachments/${id}`);
  },
  create(payload: ContentAttachmentCreate) {
    return http.post<ContentAttachment>("/admin/content-attachments", payload);
  },
  update(id: string, payload: ContentAttachmentUpdate) {
    return http.put<ContentAttachment>(`/admin/content-attachments/${id}`, payload);
  },
  remove(id: string) {
    return http.delete<void>(`/admin/content-attachments/${id}`);
  },
  upload(file: File, content_id: string, label?: string, sort_order?: number) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("content_id", content_id);
    if (label) formData.append("label", label);
    if (sort_order !== undefined) formData.append("sort_order", sort_order.toString());
    return http.post<ContentAttachment>("/admin/content-attachments/upload", formData);
  },
};

type RedirectRuleCreate = {
  source_path: string;
  target_path: string;
  status_code?: 301 | 302 | 307 | 308;
  is_active?: boolean;
  note?: string;
};

type RedirectRuleUpdate = Partial<RedirectRuleCreate>;

export const RedirectRulesApi = {
  list: () => http.get<RedirectRule[]>("/admin/redirects"),
  create: (payload: RedirectRuleCreate) => http.post<RedirectRule>("/admin/redirects", payload),
  update: (id: string, payload: RedirectRuleUpdate) => http.put<RedirectRule>(`/admin/redirects/${id}`, payload),
  remove: (id: string) => http.delete<void>(`/admin/redirects/${id}`),
};

export const AdminSettingsApi = {
  updateSettings: (data: { site_title?: string; site_logo?: string }) => http.put("/admin/settings", data),
  uploadSiteLogo: (formData: FormData) => http.post("/admin/settings/logo", formData),
};

export const AdminUsageApi = {
  get: () => http.get<any>("/admin/usage"),
};

export type SearchAnalyticsRow = {
  query: string;
  source: "public" | "suggest" | "admin";
  search_count: number;
  avg_results: number;
  last_seen_at: string;
};

export const AdminSearchApi = {
  analytics: () => http.get<SearchAnalyticsRow[]>("/admin/search/analytics?limit=50"),
  reindex: () => http.post<{ queued: boolean; task_id: string; tenant_slug: string }>("/admin/search/reindex"),
};

export const AdminHealthApi = {
  brokenLinks: () =>
    http.get<{ count: number; broken_links: Array<{ content_id: string; url: string }> }>(
      "/admin/content-health/broken-links"
    ),
};
