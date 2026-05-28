// frontend/src/shared/api/client.ts
export const API_BASE: string =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE) ||
  "/api";

export function getTenantSlug(): string | null {
  try {
    const match = window.location.pathname.match(/^\/d\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function tenantCookieSuffix(): string | null {
  const slug = getTenantSlug();
  return slug ? slug.replace(/-/g, "_") : null;
}

function readCookie(name: string): string | null {
  try {
    const found = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

function csrfToken(): string | null {
  const suffix = tenantCookieSuffix();
  if (!suffix) return readCookie("platform_csrf");
  return readCookie(`adm_csrf_${suffix}`);
}

function scopedPath(path: string): string {
  if (
    path.startsWith("/auth") ||
    path.startsWith("/healthz") ||
    path.startsWith("/static") ||
    path.startsWith("/api/static")
  ) {
    return path;
  }
  if (path.startsWith("/t/")) return path;
  const slug = getTenantSlug();
  return slug ? `/t/${encodeURIComponent(slug)}${path}` : path;
}

/* -------- Token helpers -------- */
export function getAdminToken(): string | null {
  return csrfToken() ? "cookie-session" : null;
}
export function setAdminToken(tok: string | null) {
  void tok;
}

/* Geriye dönük alias */
export const getToken = getAdminToken;
export const setToken = setAdminToken;

/* -------- QS helper -------- */
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;
export function qs(params?: QueryParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/* -------- Request / Response -------- */
type Expect = "json" | "text";

export type RequestOptions = Omit<RequestInit, "headers" | "body"> & {
  headers?: Record<string, string> | Headers;
  json?: unknown;
  auth?: boolean; // default: true
  expect?: Expect;
};

function buildHeaders(
  h?: Record<string, string> | Headers,
  auth = true,
  method = "GET"
): Headers {
  const headers = new Headers(h instanceof Headers ? h : h ?? {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (auth && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    const csrf = csrfToken();
    if (csrf && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", csrf);
  }
  return headers;
}

function normalizeFastApiError(obj: any): string | null {
  // Custom error format: {"error":{"code":"...","message":"..."}}
  if (obj?.error?.message && typeof obj.error.message === "string") {
    return obj.error.message;
  }
  // FastAPI: {"detail":"..."} ya da {"detail":[{msg:"..."}]}
  const d = obj?.detail;
  if (!d) return null;
  if (Array.isArray(d)) {
    const msgs = d.map((x) => x?.msg).filter(Boolean);
    if (msgs.length) return msgs.join(" • ");
  }
  if (typeof d === "string") return d;
  return null;
}

async function handleResponse<T>(res: Response, expect?: Expect): Promise<T> {
  if (res.status === 401) {
    setAdminToken(null);
    throw new Error("Unauthorized");
  }
  if (res.status === 403 && getTenantSlug() && res.url.includes("/admin")) {
    setAdminToken(null);
  }
  if (!res.ok) {
    // 1) JSON dene ve error message çıkar
    let errMsg: string | null = null;
    try {
      const data = await res.clone().json();
      errMsg = normalizeFastApiError(data);
    } catch {
      /* ignore json parse */
    }
    if (errMsg) throw new Error(errMsg);
    // 2) Text fallback
    let msg = "";
    try {
      msg = await res.text();
    } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (expect === "text") return (await res.text()) as unknown as T;
  if (expect === "json" || ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

/** json parametresi FormData/URLSearchParams/string ise RAW olarak gönderir */
function toBodyAndHeaders(
  headers: Headers,
  json: unknown | undefined
): { body: BodyInit | undefined; headers: Headers } {
  if (json === undefined) return { body: undefined, headers };

  const isRaw =
    typeof json === "string" ||
    json instanceof FormData ||
    json instanceof URLSearchParams ||
    json instanceof Blob ||
    json instanceof ArrayBuffer ||
    ArrayBuffer.isView(json as any);

  if (isRaw) {
    return { body: json as BodyInit, headers };
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return { body: JSON.stringify(json), headers };
}

export async function request<T = any>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { json, auth = true, expect, headers: extraHeaders, ...rest } = opts;
  const method = rest.method || "GET";
  const headers = buildHeaders(extraHeaders, auth, method);
  const { body } = toBodyAndHeaders(headers, json);
  const res = await fetch(`${API_BASE}${scopedPath(path)}`, {
    ...rest,
    headers,
    body,
    credentials: "include",
  });
  return handleResponse<T>(res, expect);
}

/* -------- Convenience helpers -------- */
export const http = {
  get: <T = any>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),

  post: <T = any>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", json }),

  put: <T = any>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", json }),

  patch: <T = any>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", json }),

  // ⬇️ Sadece şunları değiştiriyoruz:
  delete: <T = any>(path: string, opts?: RequestOptions) =>
    request<T>(path, { expect: "text", ...opts, method: "DELETE" }),

  del: <T = any>(path: string, opts?: RequestOptions) =>
    request<T>(path, { expect: "text", ...opts, method: "DELETE" }),
};
