import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiGet, siteUrl, tenantSettings } from "../../lib/api";
import { publicCopy, resolvePublicLang } from "../../lib/server-i18n";
import AdminFloatingButton from "./AdminFloatingButton";
import PublicHeader from "./PublicHeader";
import BackToTop from "./BackToTop";
import PublicDocsLayout from "./PublicDocsLayout";

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
    alternates: { canonical: url },
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
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { tenantSlug } = await params;
  const { cat } = await searchParams;

  const [docsIndex, settings, lang] = await Promise.all([
    tenantDocsIndex(tenantSlug),
    tenantSettings(tenantSlug),
    resolvePublicLang(),
  ]);

  if (docsIndex === null) notFound();

  const labels = publicCopy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const title = settings.site_title || tenantSlug;
  const initial = title.charAt(0).toUpperCase();
  const safeIndex = docsIndex ?? [];
  const initialCategorySlug = cat || safeIndex[0]?.slug || "";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ "@type": "ListItem", position: 1, name: title, item: siteUrl(`/d/${tenantSlug}`) }],
  };

  if (safeIndex.length === 0) {
    return (
      <main dir={dir} className="flex min-h-screen flex-col bg-transparent">
        <PublicHeader
          tenantSlug={tenantSlug}
          settings={settings}
          lang={lang}
          showMobileCategories={true}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            {settings.site_logo ? (
              <img src={settings.site_logo} alt={title} className="mx-auto mb-5 h-16 w-16 rounded-2xl object-cover shadow-sm" loading="lazy" decoding="async" />
            ) : (
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {initial}
              </div>
            )}
            <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-gray-500 dark:text-gray-400">{labels.noPublishedDocs}</p>
          </div>
        </div>
        <AdminFloatingButton tenantSlug={tenantSlug} label={labels.adminPanel} title={labels.openAdminPanel} />
      </main>
    );
  }

  return (
    <main dir={dir} className="min-h-screen bg-transparent text-gray-900 dark:text-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PublicHeader
        tenantSlug={tenantSlug}
        settings={settings}
        lang={lang}
        showMobileCategories={true}
      />

      <PublicDocsLayout
        tenantSlug={tenantSlug}
        docsIndex={safeIndex}
        initialCategorySlug={initialCategorySlug}
        siteTitle={title}
        labels={{
          selectHeading: labels.selectHeading,
          noContent: labels.noContent,
          copyCode: labels.copyCode,
          copied: labels.copied,
          openImage: labels.openImage,
          navigation: labels.navigation,
          sections: labels.sections,
          pages: labels.pages,
          tableOfContents: labels.tableOfContents,
        }}
      />

      <BackToTop label={labels.backToTop} />
      <AdminFloatingButton tenantSlug={tenantSlug} label={labels.adminPanel} title={labels.openAdminPanel} />
    </main>
  );
}
