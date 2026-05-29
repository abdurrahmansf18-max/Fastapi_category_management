import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, siteUrl, tenantSettings } from "../../../lib/api";
import { publicCopy, resolvePublicLang } from "../../../lib/server-i18n";
import AdminFloatingButton from "../AdminFloatingButton";
import PublicHeader from "../PublicHeader";
import PageViewTracker from "../PageViewTracker";
import { tenantThemeStyle } from "../tenant-theme";
import SearchPageClient from "./SearchPageClient";

type SearchHit = {
  source_id: string;
  matched_text: string;
  context?: string;
  url?: string;
  category?: string;
  h1?: string;
  h2?: string;
};

type RouteParams = { tenantSlug: string };
type DocsCategory = { id: string; name: string; slug: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;
  const { q = "" } = await searchParams;
  const [settings, lang] = await Promise.all([tenantSettings(tenantSlug), resolvePublicLang()]);
  const labels = publicCopy[lang];
  const title = q ? `${labels.searchMetaTitle}: ${q}` : labels.searchMetaTitle;
  const url = siteUrl(`/d/${tenantSlug}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return {
    title,
    description: `${labels.searchTitle}: ${settings.site_title || tenantSlug}`,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { tenantSlug } = await params;
  const { q = "", category = "" } = await searchParams;
  const [settings, lang, categories] = await Promise.all([
    tenantSettings(tenantSlug),
    resolvePublicLang(),
    apiGet<DocsCategory[]>(`/t/${tenantSlug}/docs-index`, 60),
  ]);
  if (categories === null) notFound();
  const labels = publicCopy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const query = q.trim();
  const siteTitle = settings.site_title || tenantSlug;

  const initialHits =
    query.length >= 2
      ? (await apiGet<SearchHit[]>(
          `/t/${tenantSlug}/search?q=${encodeURIComponent(query)}&limit=30${
            category ? `&category_slug=${encodeURIComponent(category)}` : ""
          }`,
          15
        )) || []
      : [];

  return (
    <main dir={dir} style={tenantThemeStyle(settings.primary_color)} className="tenant-theme min-h-screen bg-transparent text-gray-900 dark:text-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: siteTitle, item: siteUrl(`/d/${tenantSlug}`) },
              { "@type": "ListItem", position: 2, name: labels.searchMetaTitle, item: siteUrl(`/d/${tenantSlug}/search`) },
            ],
          }),
        }}
      />
      <PageViewTracker tenantSlug={tenantSlug} title={labels.searchTitle} />
      <PublicHeader tenantSlug={tenantSlug} settings={settings} lang={lang} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/d/${tenantSlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {labels.backToDocs}
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          {labels.searchTitle}
        </h1>

        <SearchPageClient
          tenantSlug={tenantSlug}
          initialQuery={query}
          initialCategory={category}
          initialHits={initialHits}
          categories={categories}
          labels={{
            searchPlaceholder: labels.searchPlaceholder,
            search: labels.search,
            typeTwoChars: labels.typeTwoChars,
            noResult: labels.noResult,
            backToDocs: labels.backToDocs,
            searchTitle: labels.searchTitle,
            allCategories: labels.allCategories,
            clearSearch: labels.clearSearch,
            searchResults: labels.searchResults,
            searchError: labels.searchError,
            recentSearches: labels.recentSearches,
          }}
        />
      </div>

      <AdminFloatingButton tenantSlug={tenantSlug} label={labels.adminPanel} title={labels.openAdminPanel} />
    </main>
  );
}
