import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { apiGet, siteUrl, tenantSettings, toPublicUrl } from "../../../../lib/api";
import { publicCopy, resolvePublicLang } from "../../../../lib/server-i18n";
import CopyPageLinkButton from "../../CopyPageLinkButton";
import PublicFeedbackWidget from "../../PublicFeedbackWidget";
import AdminFloatingButton from "../../AdminFloatingButton";
import PublicHeader from "../../PublicHeader";
import BackToTop from "../../BackToTop";
import MarkdownPre from "../../MarkdownPre";
import CategorySidebar from "../../CategorySidebar";

export const revalidate = 60;

type Heading = { id: string; title: string; slug: string; level: number; sort_order: number };
type ContentAttachment = {
  id: string;
  content_id: string;
  url: string;
  label: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sort_order: number;
};
type Content = {
  id: string;
  heading_id: string;
  body: string;
  description?: string;
  attachments?: ContentAttachment[];
};
type RouteParams = { tenantSlug: string; categorySlug: string; h1Slug: string };
type DocsIndexCategory = {
  id: string; name: string; slug: string;
  headings: { id: string; title: string; slug: string; children: { id: string; title: string; slug: string }[] }[];
};

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

function linkedHeading(level: 1 | 2 | 3 | 4, children: ReactNode, label: string) {
  const id = slugify(nodeText(children));
  const anchor = (
    <a
      href={`#${id}`}
      className="me-2 text-emerald-500 no-underline opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      aria-label={label}
    >
      #
    </a>
  );
  const content = <>{anchor}{children}</>;
  if (level === 1) return <h1 id={id} className="group">{content}</h1>;
  if (level === 2) return <h2 id={id} className="group">{content}</h2>;
  if (level === 3) return <h3 id={id} className="group">{content}</h3>;
  return <h4 id={id} className="group">{content}</h4>;
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

  const contentRows = contents || [];
  const attachmentsByContent = await Promise.all(
    contentRows.map(async (content) => {
      const attachments =
        (await apiGet<ContentAttachment[]>(`/t/${params.tenantSlug}/contents/${content.id}/attachments`, 60)) || [];
      return [
        content.id,
        attachments.map((item) => ({ ...item, url: toPublicUrl(item.url) || item.url })),
      ] as const;
    })
  );

  const attachmentMap = new Map(attachmentsByContent);
  const hydrated = contentRows.map((content) => ({
    ...content,
    attachments: attachmentMap.get(content.id) || [],
  }));

  return { h1, children: children || [], contents: hydrated };
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
  const [data, settings, lang, docsIndex] = await Promise.all([
    loadH1(resolved),
    tenantSettings(resolved.tenantSlug),
    resolvePublicLang(),
    apiGet<DocsIndexCategory[]>(`/t/${resolved.tenantSlug}/docs-index`, 60),
  ]);
  const labels = publicCopy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!data.h1) {
    notFound();
  }

  const categoryEntry = docsIndex?.find((c) => c.slug === resolved.categorySlug);
  const sidebarHeadings = categoryEntry?.headings || [];

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
    <main dir={dir} className="min-h-screen bg-transparent text-gray-900 dark:text-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <PublicHeader
        tenantSlug={resolved.tenantSlug}
        settings={settings}
        lang={lang}
        currentCategorySlug={resolved.categorySlug}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex gap-6 lg:gap-8 xl:gap-10">
          {/* Left sidebar — category headings tree */}
          {sidebarHeadings.length > 0 && (
            <CategorySidebar
              tenantSlug={resolved.tenantSlug}
              categorySlug={resolved.categorySlug}
              headings={sidebarHeadings}
              currentH1Slug={resolved.h1Slug}
            />
          )}

          {/* Main content */}
          <div className="min-w-0 flex-1 py-6 lg:py-8">
            {/* Breadcrumb */}
            <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-gray-400">
              <Link href={`/d/${resolved.tenantSlug}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
                {siteTitle}
              </Link>
              <span>/</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{data.h1.title}</span>
            </nav>

            <article className="card-shimmer rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-8 sm:py-10">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <h1 className="text-2xl font-bold leading-snug text-gray-900 dark:text-white sm:text-3xl">
                  {data.h1.title}
                </h1>
                <CopyPageLinkButton copyLabel={labels.copyLink} copiedLabel={labels.copied} />
              </div>

              {/* H1-level prose content */}
              {data.contents.map((content) => (
                <div key={content.id} className="mb-8 last:mb-0">
                  <div className="prose prose-gray max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-semibold prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400 prose-code:rounded-md prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal prose-code:text-slate-800 dark:prose-code:bg-gray-800 dark:prose-code:text-gray-200 prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-200 prose-pre:bg-slate-100 prose-pre:text-slate-800 dark:prose-pre:border-gray-700 dark:prose-pre:bg-gray-900 dark:prose-pre:text-gray-100 [&_pre_code]:bg-transparent [&_pre_code]:text-inherit prose-img:rounded-xl prose-blockquote:border-l-emerald-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 lg:prose-base">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        h1: ({ children }) => linkedHeading(1, children, labels.copyLink),
                        h2: ({ children }) => linkedHeading(2, children, labels.copyLink),
                        h3: ({ children }) => linkedHeading(3, children, labels.copyLink),
                        h4: ({ children }) => linkedHeading(4, children, labels.copyLink),
                        pre: ({ children, className }) => (
                          <MarkdownPre copyLabel={labels.copyCode} copiedLabel={labels.copied} className={className}>
                            {children}
                          </MarkdownPre>
                        ),
                        img: ({ src, alt }) => (
                          <a href={String(src || "")} target="_blank" rel="noreferrer" title={labels.openImage}>
                            <img src={String(src || "")} alt={String(alt || "")} loading="lazy" decoding="async" />
                          </a>
                        ),
                      }}
                    >
                      {content.body}
                    </ReactMarkdown>
                  </div>

                  {(content.attachments || []).length > 0 && (
                    <section className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {labels.attachments}
                      </h3>
                      <ul className="space-y-2">
                        {(content.attachments || []).map((attachment) => (
                          <li key={attachment.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-950">
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex max-w-full items-center gap-2 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                            >
                              <span className="truncate">{attachment.label || attachment.file_name}</span>
                            </a>
                            <div className="mt-1 text-xs text-gray-500">
                              {attachment.file_name} - {formatSize(attachment.size_bytes)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
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
                        <svg className="ms-auto h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-emerald-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <PublicFeedbackWidget
                tenantSlug={resolved.tenantSlug}
                labels={{
                  title: labels.helpfulTitle,
                  helpful: labels.helpfulYes,
                  notHelpful: labels.helpfulNo,
                  placeholder: labels.helpfulPlaceholder,
                  send: labels.sendFeedback,
                  thanks: labels.feedbackThanks,
                }}
              />
            </article>
          </div>
        </div>
      </div>

      <BackToTop label={labels.backToTop} />
      <AdminFloatingButton tenantSlug={resolved.tenantSlug} label={labels.adminPanel} title={labels.openAdminPanel} />
    </main>
  );
}
