export const apiBase =
  process.env.NEXT_INTERNAL_API_BASE ||
  process.env.NEXT_BACKEND_ORIGIN ||
  "http://localhost:8000";

export type SiteSettings = {
  site_title?: string;
  site_logo?: string;
};

// Rewrite Docker-internal / localhost backend URLs to browser-accessible proxy paths.
// e.g. http://backend:8000/api/static/foo.jpg → /api/static/foo.jpg
export function toPublicUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const m = url.match(/^https?:\/\/[^/]+(:\d+)?(\/api\/.+)$/);
  return m ? m[2] : url;
}

export async function apiGet<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function tenantSettings(tenantSlug: string): Promise<SiteSettings> {
  try {
    const res = await fetch(`${apiBase}/t/${tenantSlug}/settings`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return {};
    const raw = (await res.json()) as SiteSettings;
    return { ...raw, site_logo: toPublicUrl(raw.site_logo) };
  } catch {
    return {};
  }
}
