import { siteUrl } from "../../../lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const body = [
    "User-agent: *",
    "Allow: /",
    `Disallow: /d/${tenantSlug}/admin`,
    `Sitemap: ${siteUrl(`/d/${tenantSlug}/sitemap.xml`)}`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600",
    },
  });
}
