import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { apiGet, siteUrl, tenantSettings } from "../../../../lib/api";
import { publicCopy, resolvePublicLang } from "../../../../lib/server-i18n";
import CopyPageLinkButton from "../../CopyPageLinkButton";
import PublicFeedbackWidget from "../../PublicFeedbackWidget";
import AdminFloatingButton from "../../AdminFloatingButton";
import PublicHeader from "../../PublicHeader";
import BackToTop from "../../BackToTop";

export const revalidate = 60;

type Heading = { id: string; title: string; slug: string; level: number; sort_order: number };
type Content = { id: string; heading_id: string; body: string; description?: string };
type RouteParams = { tenantSlug: string; categorySlug: string; h1Slug: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function nodeText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node && typeof node === "object" && "props" in node)
    return nodeText((node as { props: { children?: unknown } }).props.children);
  return "";
}

async function loadH1(params: RouteParams) {
  const headings = await apiGet<Heading[]>(
    `/t/${params.tenantSlug}/categories/${params.categorySlug}/headings`,
    60
  );
  const h1 = headings?.find((item) => item.slug === params.h1Slug) || null;
  const [children, contents] = h1
    ? await Promise.all([
        apiGet<Heading[]>(
          `/t/${params.tenantSlug}/categories/${params.categorySlug}/${params.h1Slug}/headings`,
          60
        ),
        apiGet<Content[]>(`/t/${params.tenantSlug}/public/contents?heading_id=${h1.id}`, 60),
      ])
    : [[], []];
  return { h1, children: children || [], contents: contents || [] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const resolved = await params;
  const [data, settings, lang] = await Promise.all([
    loadH1(resolved),
    tenantSettings(resolved.tenantSlug),
    resolvePublicLang(),
  ]);
  const labels = publicCopy[lang];
  const title = data.h1?.title || resolved.h1Slug;
  const url = siteUrl(`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}`);
  return {
    title,
    description: `${title} ${labels.documentation}`,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: `${title} ${labels.documentation}`,
      url,
      type: "article",
      siteName: settings.site_title || resolved.tenantSlug,
      locale: lang === "ar" ? "ar_AR" : lang === "en" ? "en_US" : "tr_TR",
    },
  };
}

export default async function PublicH1Page({ params }: { params: Promise<RouteParams> }) {
  const resolved = await params;
  const [data, settings, lang] = await Promise.all([
    loadH1(resolved),
    tenantSettings(resolved.tenantSlug),
    resolvePublicLang(),
  ]);
  const labels = publicCopy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  if (!data.h1) {
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
            <p className="font-semibold text-gray-700 dark:text-gray-300">{labels.notFoundSection}</p>
            <Link href={`/d/${resolved.tenantSlug}`} className="mt-3 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400">
              ← {labels.backToDocs}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const siteTitle = settings.site_title || resolved.tenantSlug;
  const pageUrl = siteUrl(`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}`);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteTitle, item: siteUrl(`/d/${resolved.tenantSlug}`) },
      { "@type": "ListItem", position: 2, name: data.h1.title, item: pageUrl },
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
          <span className="font-medium text-gray-700 dark:text-gray-200">{data.h1.title}</span>
        </nav>

        <div className="lg:flex lg:gap-8 xl:gap-10">
          {/* Main content */}
          <div className="min-w-0 flex-1">
            <article className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-8 sm:py-10">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <h1 className="text-2xl font-bold leading-snug text-gray-900 dark:text-white sm:text-3xl">
                  {data.h1.title}
                </h1>
                <CopyPageLinkButton />
              </div>

              {/* H1-level prose content */}
              {data.contents.map((content) => (
                <div
                  key={content.id}
                  className="prose prose-gray max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-semibold prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400 prose-code:rounded-md prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal dark:prose-code:bg-gray-800 prose-pre:rounded-xl prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-img:rounded-xl prose-blockquote:border-l-emerald-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 lg:prose-base"
                >
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
                    {content.body}
                  </ReactMarkdown>
                </div>
              ))}

              {/* H2 sub-pages as card grid */}
              {data.children.length > 0 && (
                <section className={data.contents.length > 0 ? "mt-10 border-t border-gray-100 pt-8 dark:border-gray-800" : ""}>
                  {data.contents.length > 0 && (
                    <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {labels.publishedDocs}
                    </h2>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${child.slug}`}
                        className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition-all hover:border-emerald-200 hover:bg-white hover:shadow-sm dark:border-gray-700/60 dark:bg-gray-800/50 dark:hover:border-emerald-800 dark:hover:bg-gray-800"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm transition group-hover:bg-emerald-50 dark:bg-gray-700 dark:group-hover:bg-emerald-900/20">
                          <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="min-w-0 truncate text-sm font-semibold text-gray-800 transition group-hover:text-emerald-700 dark:text-gray-200 dark:group-hover:text-emerald-400">
                          {child.title}
                        </span>
                        <svg className="ml-auto h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-emerald-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <PublicFeedbackWidget tenantSlug={resolved.tenantSlug} />
            </article>
          </div>

          {/* Right sidebar — sub-page navigation */}
          {data.children.length > 0 && (
            <aside className="mt-6 lg:mt-0 lg:w-60 lg:shrink-0 xl:w-64">
              <div className="lg:sticky lg:top-20">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Navigation
                    </p>
                  </div>
                  <nav className="thin-scroll max-h-[calc(100vh-12rem)] overflow-y-auto p-1.5">
                    {data.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${child.slug}`}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                        <span className="min-w-0 truncate">{child.title}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
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
