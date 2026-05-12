import type { Metadata } from "next";
import Link from "next/link";
import { apiGet, siteUrl, tenantSettings } from "../../lib/api";
import { publicCopy, resolvePublicLang } from "../../lib/server-i18n";
import AdminFloatingButton from "./AdminFloatingButton";
import PublicHeader from "./PublicHeader";
import BackToTop from "./BackToTop";
import LiveSearchBar from "./LiveSearchBar";

export const revalidate = 60;

type DocsIndexHeading = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  children: DocsIndexHeading[];
};

type DocsIndexCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  headings: DocsIndexHeading[];
};

async function tenantDocsIndex(tenantSlug: string) {
  return apiGet<DocsIndexCategory[]>(`/t/${tenantSlug}/docs-index`, 60);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;
  const [settings, lang] = await Promise.all([tenantSettings(tenantSlug), resolvePublicLang()]);
  const labels = publicCopy[lang];
  const title = settings.site_title || tenantSlug;
  const url = siteUrl(`/d/${tenantSlug}`);
  return {
    title,
    description: `${title} ${labels.workspaceDocs}`,
    alternates: { canonical: url, languages: { tr: url, en: url, ar: url } },
    openGraph: {
      title,
      description: `${title} ${labels.workspaceDocs}`,
      url,
      type: "website",
      locale: lang === "ar" ? "ar_AR" : lang === "en" ? "en_US" : "tr_TR",
      images: settings.site_logo ? [{ url: settings.site_logo }] : undefined,
    },
  };
}

export default async function TenantPublicPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const [settings, docsIndex, lang] = await Promise.all([
    tenantSettings(tenantSlug),
    tenantDocsIndex(tenantSlug),
    resolvePublicLang(),
  ]);
  const labels = publicCopy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const title = settings.site_title || tenantSlug;
  const initial = title.charAt(0).toUpperCase();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: title, item: siteUrl(`/d/${tenantSlug}`) }],
  };

  if (!docsIndex || docsIndex.length === 0) {
    return (
      <main dir={dir} className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <PublicHeader tenantSlug={tenantSlug} settings={settings} lang={lang} />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            {settings.site_logo ? (
              <img src={settings.site_logo} alt={title} className="mx-auto mb-5 h-16 w-16 rounded-2xl object-cover shadow-sm" />
            ) : (
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {initial}
              </div>
            )}
            <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-500 dark:text-gray-400">{labels.noPublishedDocs}</p>
          </div>
        </div>
        <AdminFloatingButton tenantSlug={tenantSlug} />
      </main>
    );
  }

  const totalHeadings = docsIndex.reduce((n, c) => n + c.headings.length, 0);
  const totalSubHeadings = docsIndex.reduce(
    (n, c) => n + c.headings.reduce((m, h) => m + h.children.length, 0),
    0
  );

  return (
    <main dir={dir} className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PublicHeader tenantSlug={tenantSlug} settings={settings} lang={lang} />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">

        {/* Hero */}
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          {/* Identity row */}
          <div className="mb-4 flex items-center gap-3">
            {settings.site_logo ? (
              <img src={settings.site_logo} alt={title} className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-sm dark:bg-emerald-700">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white">{title}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                  {docsIndex.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {totalHeadings}
                </span>
                {totalSubHeadings > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h6" /></svg>
                    {totalSubHeadings}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Live search */}
          <LiveSearchBar
            tenantSlug={tenantSlug}
            placeholder={labels.searchPlaceholder}
            allResultsLabel={labels.allResults}
          />
        </div>

        {/* Category sections — full width, clean hierarchy */}
        <div className="space-y-6">
          {docsIndex.map((category) => (
            <section key={category.id} id={category.slug} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

              {/* Category header */}
              <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50/70 px-5 py-3.5 dark:border-gray-800 dark:bg-gray-800/50">
                <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">{category.name}</h2>
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {category.headings.length}
                </span>
              </div>

              {/* Heading grid */}
              <div className="grid gap-px bg-gray-100 dark:bg-gray-800 sm:grid-cols-2 lg:grid-cols-3">
                {category.headings.map((heading) => (
                  <Link
                    key={heading.id}
                    href={`/d/${tenantSlug}/${category.slug}/${heading.slug}`}
                    className="group flex flex-col gap-2 bg-white p-4 transition-colors hover:bg-emerald-50/60 dark:bg-gray-900 dark:hover:bg-emerald-950/30"
                  >
                    {/* H1 title */}
                    <div className="flex items-start gap-2.5">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-800 transition group-hover:text-emerald-700 dark:text-gray-100 dark:group-hover:text-emerald-400">
                        {heading.title}
                      </span>
                    </div>

                    {/* H2 sub-headings */}
                    {heading.children.length > 0 && (
                      <ul className="ml-6 space-y-1 border-l border-gray-100 pl-3 dark:border-gray-700">
                        {heading.children.slice(0, 5).map((child) => (
                          <li key={child.id} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                            <span className="truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-500">
                              {child.title}
                            </span>
                          </li>
                        ))}
                        {heading.children.length > 5 && (
                          <li className="text-xs text-emerald-500 dark:text-emerald-600">
                            +{heading.children.length - 5} more
                          </li>
                        )}
                      </ul>
                    )}
                  </Link>
                ))}
              </div>

            </section>
          ))}
        </div>
      </div>

      <BackToTop />
      <AdminFloatingButton tenantSlug={tenantSlug} />
    </main>
  );
}
