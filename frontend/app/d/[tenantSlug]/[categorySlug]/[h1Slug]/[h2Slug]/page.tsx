import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { apiGet, siteUrl, tenantSettings, toPublicUrl } from "../../../../../lib/api";
import { publicCopy, resolvePublicLang } from "../../../../../lib/server-i18n";
import CopyPageLinkButton from "../../../CopyPageLinkButton";
import PublicFeedbackWidget from "../../../PublicFeedbackWidget";
import AdminFloatingButton from "../../../AdminFloatingButton";
import PublicHeader from "../../../PublicHeader";
import DocSidebar from "../../../DocSidebar";
import BackToTop from "../../../BackToTop";
import MarkdownPre from "../../../MarkdownPre";
import CategorySidebar from "../../../CategorySidebar";
import PageViewTracker from "../../../PageViewTracker";

export const revalidate = 60;

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "src", "alt", "width", "height", "loading", "decoding"],
  },
};

type PageData = {
  content_id: string;
  category: string;
  h1: string;
  h2: string;
  title: string;
  body: string;
  description?: string;
};

type Heading = { id: string; title: string; slug: string; level: number; sort_order: number };
type ContentImage = { id: string; url: string; alt: string; sort_order: number; width?: number; height?: number };
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

type RouteParams = {
  tenantSlug: string;
  categorySlug: string;
  h1Slug: string;
  h2Slug: string;
};

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

function injectImages(body: string, images: ContentImage[]): string {
  let index = 0;
  return body.replace(/<--image-->/g, () => {
    const image = images[index++];
    if (!image) return "";
    const widthAttr = image.width ? ` width="${image.width}"` : "";
    const heightAttr = image.height ? ` height="${image.height}"` : "";
    return `<img src="${image.url}" alt="${image.alt || "image"}"${widthAttr}${heightAttr} loading="lazy" decoding="async" />`;
  });
}

function injectFiles(body: string, attachments: ContentAttachment[]): string {
  let index = 0;
  return body.replace(/<--file-->/g, () => {
    const att = attachments[index++];
    if (!att) return "";
    const label = att.label || att.file_name;
    return `<a href="${att.url}" target="_blank" rel="noreferrer noopener">📎 ${label}</a>`;
  });
}

async function loadPage(params: RouteParams) {
  return apiGet<PageData>(
    `/t/${params.tenantSlug}/page/${params.categorySlug}/${params.h1Slug}/${params.h2Slug}`,
    60
  );
}

async function loadPageAttachments(params: RouteParams) {
  const items =
    (await apiGet<ContentAttachment[]>(
      `/t/${params.tenantSlug}/page/${params.categorySlug}/${params.h1Slug}/${params.h2Slug}/attachments`,
      60
    )) || [];
  return items.map((item) => ({ ...item, url: toPublicUrl(item.url) || item.url }));
}

async function loadPageImages(params: RouteParams) {
  const images =
    (await apiGet<ContentImage[]>(
      `/t/${params.tenantSlug}/page/${params.categorySlug}/${params.h1Slug}/${params.h2Slug}/images`,
      60
    )) || [];
  return images.map((item) => ({ ...item, url: toPublicUrl(item.url) || item.url }));
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
  const [page, siblings, settings, lang, docsIndex, attachments, images] = await Promise.all([
    loadPage(resolved),
    loadSiblings(resolved),
    tenantSettings(resolved.tenantSlug),
    resolvePublicLang(),
    apiGet<DocsIndexCategory[]>(`/t/${resolved.tenantSlug}/docs-index`, 60),
    loadPageAttachments(resolved),
    loadPageImages(resolved),
  ]);
  const labels = publicCopy[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!page) {
    notFound();
  }

  const fileMarkerCount = (page.body.match(/<--file-->/g) || []).length;
  const inlineAttachments = attachments.slice(0, fileMarkerCount);
  const bottomAttachments = attachments.slice(fileMarkerCount);

  let renderedBody = images.length ? injectImages(page.body, images) : page.body;
  if (fileMarkerCount > 0) {
    renderedBody = injectFiles(renderedBody, inlineAttachments);
  }
  const toc = extractToc(renderedBody);
  const siteTitle = settings.site_title || resolved.tenantSlug;

  const categoryEntry = docsIndex?.find((c) => c.slug === resolved.categorySlug);
  const sidebarHeadings = categoryEntry?.headings || [];

  // Prev / Next from siblings
  const currentIdx = siblings.findIndex((s) => s.slug === resolved.h2Slug);
  const prevPage = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const nextPage = currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteTitle, item: siteUrl(`/d/${resolved.tenantSlug}`) },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryEntry?.name || resolved.categorySlug,
        item: siteUrl(`/d/${resolved.tenantSlug}?cat=${resolved.categorySlug}`),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.h1,
        item: siteUrl(`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}`),
      },
      { "@type": "ListItem", position: 4, name: page.title, item: siteUrl(`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${resolved.h2Slug}`) },
    ],
  };
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.description || `${page.title} ${labels.documentation}`,
    mainEntityOfPage: siteUrl(`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${resolved.h2Slug}`),
    isPartOf: { "@type": "WebSite", name: siteTitle, url: siteUrl(`/d/${resolved.tenantSlug}`) },
  };

  return (
    <main dir={dir} className="min-h-screen bg-transparent text-gray-900 dark:text-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <PageViewTracker tenantSlug={resolved.tenantSlug} title={page.title} contentId={page.content_id} />

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
              currentH2Slug={resolved.h2Slug}
            />
          )}

          {/* Main content + right sidebar */}
          <div className="flex min-w-0 flex-1 gap-6 py-6 lg:gap-8 lg:py-8">
            {/* Article */}
            <div className="min-w-0 flex-1">
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

              <article className="card-shimmer rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-8 sm:py-10">
                {/* Title row */}
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                  <h1 className="text-2xl font-bold leading-snug text-gray-900 dark:text-white sm:text-3xl">
                    {page.title}
                  </h1>
                  <CopyPageLinkButton copyLabel={labels.copyLink} copiedLabel={labels.copied} />
                </div>

                {/* Description lead */}
                {page.description && (
                  <p className="mb-7 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm leading-relaxed text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/15 dark:text-emerald-300">
                    {page.description}
                  </p>
                )}

                {/* Markdown body */}
                <div className="prose prose-gray max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-semibold prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400 prose-code:rounded-md prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal prose-code:text-slate-800 dark:prose-code:bg-gray-800 dark:prose-code:text-gray-200 prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-200 prose-pre:bg-slate-100 prose-pre:text-slate-800 dark:prose-pre:border-gray-700 dark:prose-pre:bg-gray-900 dark:prose-pre:text-gray-100 [&_pre_code]:bg-transparent [&_pre_code]:text-inherit prose-img:rounded-xl prose-blockquote:border-l-emerald-400 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 lg:prose-base">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
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
                    {renderedBody}
                  </ReactMarkdown>
                </div>

                {bottomAttachments.length > 0 && (
                  <section className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {labels.attachments}
                    </h2>
                    <ul className="space-y-2">
                      {bottomAttachments.map((attachment) => (
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

              {/* Prev / Next navigation */}
              {(prevPage || nextPage) && (
                <nav className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {prevPage ? (
                    <Link
                      href={`/d/${resolved.tenantSlug}/${resolved.categorySlug}/${resolved.h1Slug}/${prevPage.slug}`}
                      className="group flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
                    >
                      <span className="text-xs text-gray-400 group-hover:text-emerald-500">{labels.previous}</span>
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
                      className="group flex flex-col items-end gap-1 rounded-xl border border-gray-200 bg-white p-4 text-end transition hover:border-emerald-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
                    >
                      <span className="text-xs text-gray-400 group-hover:text-emerald-500">{labels.next}</span>
                      <span className="truncate text-sm font-semibold text-gray-700 group-hover:text-emerald-700 dark:text-gray-300 dark:group-hover:text-emerald-400">
                        {nextPage.title}
                      </span>
                    </Link>
                  )}
                </nav>
              )}
            </div>

            {/* Right sidebar — TOC */}
            {toc.length > 0 && (
              <aside className="mt-0 hidden xl:block xl:w-56 xl:shrink-0">
                <div className="sticky top-16">
                  <DocSidebar
                    toc={toc}
                    navItems={[]}
                    currentSlug={resolved.h2Slug}
                    tenantSlug={resolved.tenantSlug}
                    categorySlug={resolved.categorySlug}
                    h1Slug={resolved.h1Slug}
                    navLabel={labels.navigation}
                    tocLabel={labels.tableOfContents}
                  />
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>

      <BackToTop label={labels.backToTop} />
      <AdminFloatingButton tenantSlug={resolved.tenantSlug} label={labels.adminPanel} title={labels.openAdminPanel} />
    </main>
  );
}
