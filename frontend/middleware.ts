import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Docker-internal backend URL (server-side only)
const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_BASE ||
  process.env.NEXT_BACKEND_ORIGIN ||
  "http://localhost:8000";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept /d/[tenantSlug]/<something> paths
  const m = pathname.match(/^\/d\/([a-z0-9][a-z0-9-]{0,62})(\/.*)/);
  if (!m) return NextResponse.next();

  const [, tenantSlug, tenantPath] = m;

  // Skip: admin UI, search page, static assets (.xml, .txt, .ico …)
  if (
    tenantPath === "/admin" ||
    tenantPath.startsWith("/admin/") ||
    tenantPath === "/search" ||
    /\.[a-z]{2,5}$/.test(tenantPath)
  ) {
    return NextResponse.next();
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500); // 1.5 s timeout

    let res: Response | undefined;
    try {
      res = await fetch(
        `${INTERNAL_API}/t/${tenantSlug}/redirects/resolve?path=${encodeURIComponent(tenantPath)}`,
        {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timer);
    }

    if (res?.ok) {
      const rule = (await res.json()) as {
        target_path: string;
        status_code: number;
      };

      // Only redirect if target differs from current path (loop guard)
      if (rule.target_path && rule.target_path !== tenantPath) {
        const destination = request.nextUrl.clone();
        destination.pathname = `/d/${tenantSlug}${rule.target_path}`;
        return NextResponse.redirect(destination, {
          status: rule.status_code,
        });
      }
    }
  } catch {
    // Timeout or network error — pass through to Next.js normally
  }

  return NextResponse.next();
}

export const config = {
  // Run on all /d/[tenantSlug]/[path...] routes (at least one segment after slug)
  matcher: ["/d/:tenantSlug/:path+"],
};
