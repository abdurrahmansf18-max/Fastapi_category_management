import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { apiGet, siteUrl, tenantSettings } from "../../../../../lib/api";
import { publicCopy, resolvePublicLang } from "../../../../../lib/server-i18n";
import CopyPageLinkButton from "../../../CopyPageLinkButton";
import PublicFeedbackWidget from "../../../PublicFeedbackWidget";
import AdminFloatingButton from "../../../AdminFloatingButton";
import PublicHeader from "../../../PublicHeader";
import DocSidebar from "../../../DocSidebar";
import BackToTop from "../../../BackToTop";

export const revalidate = 60;

type PageData = {
  category: string;
  h1: string;
  h2: string;
  title: string;
  body: string;
  description?: string;
};

type Heading = { id: string; title: string; slug: string; level: number; sort_order: number };

type RouteParams = {
  tenantSlug: string;
  categorySlug: string;
  h1Slug: string;
  h2Slug: string;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractToc(markdown: string): { level: number; text: string; id: string }[] {
  const result: { level: number; text: string; id: string }[] = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(/^(#{1,4})\s+(.+)/);
    if (m) result.push({ level: m[1].length, text: m[2].trim(), id: slugify(m[2].trim()) });
  }
  return result;
}

function nodeText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node && typeof node === "object" && "props" in node)
    return nodeText((node as { props: { children?: unknown } }).props.children);
  return "";
}

async function loadPage(params: RouteParams) {
  return apiGet<PageData>(
    `/t/${params.tenantSlug}/page/${params.categorySlug}/${params.h1Slug}/${params.h2Slug}`,
    60
  );
}

async function loadSiblings(params: RouteParams) {
  return (
    (await apiGet<Heading[]>(
      `/t/${params.tenantSlug}/categories/${params.categorySlug}/${params.h1Slug}/headings`,
      60
    )) || []
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const resolved = await params;
  const [page, settings, lang] = await Promise.all([
    loadPage(resolved),
    tenantSettings(resolved.tenantSlug),
    resolvePublicLang(),
  ]);
  const labels = publicCopy[lang];
  const title = page?.title || settings.site_title || resolved.h2Slug;
  const description = page?.description || `${title} ${labels.documentation}`;
  const url = siteUrl(
    `/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${resolved.h2Slug}`
  );
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: settings.site_title || resolved.tenantSlug,
      locale: lang === "ar" ? "ar_AR" : lang === "en" ? "en_US" : "tr_TR",
      images: settings.site_logo ? [{ url: settings.site_logo }] : undefined,
    },
  };
}

export default async function PublicDocPage({ params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const [page, siblings, settings, lang] = await Promise.all([
    loadPage(resolved),
    loadSiblings(resolved),
    tenantSettings(resolved.tenantSlug),
    resolvePublicLang(),
  ]);
  const labels = publicCopy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  if (!page) {
    return (
      <main dir={dir} className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <PublicHeader tenantSlug={resolved.tenantSlug} settings={settings} lang={lang} currentCategorySlug={resolved.categorySlug} />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-700 dark:text-gray-300">{labels.notFoundPage}</p>
            <Link href={`/d/${resolved.tenantSlug}`} className="mt-3 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
              ← {labels.backToDocs}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const toc = extractToc(page.body);
  const siteTitle = settings.site_title || resolved.tenantSlug;

  // Prev / Next from siblings
  const currentIdx = siblings.findIndex((s) => s.slug === resolved.h2Slug);
  const prevPage = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const nextPage = currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteTitle, item: siteUrl(`/d/${resolved.tenantSlug}`) },
      { "@type": "ListItem", position: 2, name: page.h1 },
      { "@type": "ListItem", position: 3, name: page.title },
    ],
  };

  return (
    <main dir={dir} className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <PublicHeader
        tenantSlug={resolved.tenantSlug}
        settings={settings}
        lang={lang}
        currentCategorySlug={resolved.categorySlug}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-gray-400">
          <Link href={`/d/${resolved.tenantSlug}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
            {siteTitle}
          </Link>
          <span>/</span>
          <Link
            href={`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}`}
            className="hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            {page.h1}
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">{page.title}</span>
        </nav>

        <div className="lg:flex lg:gap-8 xl:gap-10">
          {/* Article */}
          <div className="min-w-0 flex-1">
            <article className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-8 sm:py-10">
              {/* Title row */}
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <h1 className="text-2xl font-bold leading-snug text-gray-900 dark:text-white sm:text-3xl">
                  {page.title}
                </h1>
                <CopyPageLinkButton />
              </div>

              {/* Markdown body */}
              <div className="prose prose-gray max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-semibold prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400 prose-code:rounded-md prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal dark:prose-code:bg-gray-800 prose-pre:rounded-xl prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-img:rounded-xl prose-blockquote:border-l-emerald-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 lg:prose-base">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    h1: ({ children }) => <h1 id={slugify(nodeText(children))}>{children}</h1>,
                    h2: ({ children }) => <h2 id={slugify(nodeText(children))}>{children}</h2>,
                    h3: ({ children }) => <h3 id={slugify(nodeText(children))}>{children}</h3>,
                    h4: ({ children }) => <h4 id={slugify(nodeText(children))}>{children}</h4>,
                  }}
                >
                  {page.body}
                </ReactMarkdown>
              </div>

              <PublicFeedbackWidget tenantSlug={resolved.tenantSlug} />
            </article>

            {/* Prev / Next navigation */}
            {(prevPage || nextPage) && (
              <nav className="mt-6 grid grid-cols-2 gap-3">
                {prevPage ? (
                  <Link
                    href={`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${prevPage.slug}`}
                    className="group flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
                  >
                    <span className="text-xs text-gray-400 group-hover:text-emerald-500">← Previous</span>
                    <span className="truncate text-sm font-semibold text-gray-700 group-hover:text-emerald-700 dark:text-gray-300 dark:group-hover:text-emerald-400">
                      {prevPage.title}
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
                {nextPage && (
                  <Link
                    href={`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${nextPage.slug}`}
                    className="group flex flex-col items-end gap-1 rounded-xl border border-gray-200 bg-white p-4 text-right transition hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
                  >
                    <span className="text-xs text-gray-400 group-hover:text-emerald-500">Next →</span>
                    <span className="truncate text-sm font-semibold text-gray-700 group-hover:text-emerald-700 dark:text-gray-300 dark:group-hover:text-emerald-400">
                      {nextPage.title}
                    </span>
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Right sidebar */}
          {(siblings.length > 0 || toc.length > 0) && (
            <aside className="mt-6 lg:mt-0 lg:w-60 lg:shrink-0 xl:w-64">
              <div className="lg:sticky lg:top-20">
                <DocSidebar
                  toc={toc}
                  navItems={siblings}
                  currentSlug={resolved.h2Slug}
                  tenantSlug={resolved.tenantSlug}
                  categorySlug={resolved.categorySlug}
                  h1Slug={resolved.h1Slug}
                  navLabel="Navigation"
                  tocLabel="Table of Contents"
                />
              </div>
            </aside>
          )}
        </div>
      </div>

      <BackToTop />
      <AdminFloatingButton tenantSlug={resolved.tenantSlug} />
    </main>
  );
}
