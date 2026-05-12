import { apiGet, siteUrl } from "../../../lib/api";

type SeoPages = { urls: string[] };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const seoPages = await apiGet<SeoPages>(`/t/${tenantSlug}/seo/pages`, 300);
  const urls = seoPages?.urls?.length ? seoPages.urls : [`/d/${tenantSlug}`];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${siteUrl(url)}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url.split("/").length <= 3 ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
