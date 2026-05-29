"use client";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import MarkdownPre from "./MarkdownPre";
import { trackTenantPageView } from "./PageViewTracker";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), "src", "alt", "width", "height", "loading", "decoding", "style"],
  },
};

type H2Item = { id: string; title: string; slug: string };
type H1Item = { id: string; title: string; slug: string; children: H2Item[] };
type Category = { id: string; name: string; slug: string; headings: H1Item[] };
type ContentImage = { id: string; url: string; alt: string; sort_order: number; width?: number; height?: number };
type ContentAttachment = { id: string; url: string; label: string; file_name: string; sort_order: number };
type Content = { id: string; heading_id: string; body: string; description?: string; images?: ContentImage[]; attachments?: ContentAttachment[] };

type Labels = {
  selectHeading: string;
  noContent: string;
  copyCode: string;
  copied: string;
  openImage: string;
  navigation: string;
  sections: string;
  pages: string;
  tableOfContents: string;
};

function injectImages(body: string, images: ContentImage[]): string {
  let i = 0;
  return body.replace(/<--image-->/g, () => {
    const img = images[i++];
    if (!img) return "";
    const alt = img.alt || "image";
    const widthAttr = img.width ? ` width="${img.width}"` : "";
    const heightAttr = img.height ? ` height="${img.height}"` : "";
    // Use HTML img tag so width/height are preserved; rehype-sanitize allows these attrs
    return `<img src="${img.url}" alt="${alt}"${widthAttr}${heightAttr} loading="lazy" />`;
  });
}

function injectFiles(body: string, attachments: ContentAttachment[]): string {
  let i = 0;
  return body.replace(/<--file-->/g, () => {
    const att = attachments[i++];
    if (!att) return "";
    const label = att.label || att.file_name;
    return `<a href="${att.url}" target="_blank" rel="noreferrer noopener">📎 ${label}</a>`;
  });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
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
    <a href={`#${id}`} className="me-2 text-emerald-500 no-underline opacity-0 transition-opacity group-hover:opacity-100" aria-label={label}>
      #
    </a>
  );
  const content = <>{anchor}{children}</>;
  if (level === 1) return <h1 id={id} className="group">{content}</h1>;
  if (level === 2) return <h2 id={id} className="group">{content}</h2>;
  if (level === 3) return <h3 id={id} className="group">{content}</h3>;
  return <h4 id={id} className="group">{content}</h4>;
}

/* ── Sidebar navigation tree (shared between desktop & mobile drawer) ── */
function NavTree({
  headings,
  activeH1,
  activeH2,
  expandedSlugs,
  onH1Click,
  onH2Click,
}: {
  headings: H1Item[];
  activeH1: H1Item | null;
  activeH2: H2Item | null;
  expandedSlugs: Set<string>;
  onH1Click: (h1: H1Item) => void;
  onH2Click: (h1: H1Item, h2: H2Item) => void;
}) {
  return (
    <nav className="p-2">
      {headings.map((h1) => {
        const isActiveH1 = h1.slug === activeH1?.slug;
        const isExpanded = expandedSlugs.has(h1.slug) || isActiveH1;
        return (
          <div key={h1.id} className="mb-0.5">
            <button
              type="button"
              onClick={() => onH1Click(h1)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors sm:py-2 ${
                isActiveH1 && !activeH2
                  ? "bg-emerald-50 font-bold text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "font-medium text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-start leading-snug">{h1.title}</span>
              {h1.children.length > 0 && (
                <svg
                  className={`h-3 w-3 shrink-0 transition-transform ${
                    isExpanded ? "rotate-90 text-emerald-500" : "text-gray-400 dark:text-gray-500"
                  }`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {isExpanded && h1.children.length > 0 && (
              <div className="ms-3 mt-0.5 border-s-2 border-emerald-200 ps-2.5 dark:border-emerald-800/60">
                {h1.children.map((h2) => {
                  const isActiveH2 = isActiveH1 && h2.slug === activeH2?.slug;
                  return (
                    <button
                      key={h2.id}
                      type="button"
                      onClick={() => onH2Click(h1, h2)}
                      className={`mb-0.5 flex w-full items-center rounded-md px-2.5 py-2 text-start text-xs leading-snug transition-colors sm:py-1.5 ${
                        isActiveH2
                          ? "bg-emerald-50 font-bold text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                      }`}
                    >
                      {h2.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ── Main component ── */
export default function PublicDocsLayout({
  tenantSlug,
  docsIndex,
  initialCategorySlug,
  siteTitle,
  labels,
}: {
  tenantSlug: string;
  docsIndex: Category[];
  initialCategorySlug: string;
  siteTitle: string;
  labels: Labels;
}) {
  const [catSlug, setCatSlug] = useState(initialCategorySlug);
  const [activeH1, setActiveH1] = useState<H1Item | null>(null);
  const [activeH2, setActiveH2] = useState<H2Item | null>(null);
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(new Set());
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const selectedCategory = docsIndex.find((c) => c.slug === catSlug);
  const activeTitle = activeH2 ? activeH2.title : activeH1?.title ?? null;

  const tocHeadings = useMemo(() => {
    if (!contents.length) return [];
    const result: { level: number; text: string; id: string }[] = [];
    for (const c of contents) {
      for (const line of c.body.split("\n")) {
        const m = line.match(/^(#{1,4})\s+(.+)$/);
        if (m) result.push({ level: m[1].length, text: m[2].trim(), id: slugify(m[2].trim()) });
      }
    }
    return result;
  }, [contents]);

  // Close drawer on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setDrawerOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // Update category from URL change
  useEffect(() => {
    setCatSlug(initialCategorySlug);
    setActiveH1(null);
    setActiveH2(null);
    setExpandedSlugs(new Set());
    setContents([]);
  }, [initialCategorySlug]);

  function handleCategorySelect(nextSlug: string) {
    if (!nextSlug || nextSlug === catSlug) return;
    setCatSlug(nextSlug);
    setActiveH1(null);
    setActiveH2(null);
    setExpandedSlugs(new Set());
    setContents([]);
    setDrawerOpen(false);
  }

  async function loadContent(headingId: string, title: string) {
    setLoading(true);
    setContents([]);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/public/contents?heading_id=${headingId}`);
      if (!res.ok) return;
      const items: Content[] = await res.json();

      // For each content, fetch images (if <--image-->) and attachments (if <--file-->)
      const withAssets = await Promise.all(
        items.map(async (c) => {
          const [images, attachments] = await Promise.all([
            c.body.includes("<--image-->")
              ? fetch(`/api/t/${tenantSlug}/contents/${c.id}/images`)
                  .then((r) => (r.ok ? r.json() : []))
                  .catch(() => [])
              : Promise.resolve(undefined),
            c.body.includes("<--file-->")
              ? fetch(`/api/t/${tenantSlug}/contents/${c.id}/attachments`)
                  .then((r) => (r.ok ? r.json() : []))
                  .catch(() => [])
              : Promise.resolve(undefined),
          ]);
          return {
            ...c,
            ...(images !== undefined ? { images } : {}),
            ...(attachments !== undefined ? { attachments } : {}),
          };
        })
      );
      setContents(withAssets);
      trackTenantPageView({
        tenantSlug,
        title,
        contentId: withAssets[0]?.id,
        url: `${window.location.pathname}${window.location.search}#${slugify(title)}`,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleH1Click(h1: H1Item) {
    if (h1.children.length > 0) {
      setExpandedSlugs((prev) => {
        const next = new Set(prev);
        if (next.has(h1.slug)) next.delete(h1.slug);
        else next.add(h1.slug);
        return next;
      });
      setActiveH1(h1);
      setActiveH2(null);
      setContents([]);
    } else {
      setActiveH1(h1);
      setActiveH2(null);
      loadContent(h1.id, h1.title);
    }
    setDrawerOpen(false);
  }

  function handleH2Click(h1: H1Item, h2: H2Item) {
    setActiveH1(h1);
    setActiveH2(h2);
    setExpandedSlugs((prev) => new Set([...prev, h1.slug]));
    loadContent(h2.id, h2.title);
    setDrawerOpen(false);
  }

  return (
    <div className="flex bg-transparent">

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 start-0 z-50 flex flex-col bg-white shadow-2xl transition-all duration-300 dark:bg-gray-900
          border-e border-gray-200 dark:border-gray-800
          lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] lg:shadow-none lg:translate-x-0
          ${drawerOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "lg:w-12" : "lg:w-56 xl:w-64"}
        `}
      >
        {/* Mobile drawer header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800 lg:hidden">
          <span className="text-sm font-semibold text-gray-800 dark:text-white">
            {selectedCategory?.name || labels.navigation}
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close navigation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Desktop collapse / expand button */}
        <div className={`hidden shrink-0 border-b border-gray-100 dark:border-gray-800 lg:flex ${sidebarCollapsed ? "justify-center px-1 py-2" : "justify-end px-2 py-2"}`}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Scrollable nav tree — glow-scroll */}
        <div
          className={`glow-scroll flex-1 overflow-y-auto overflow-x-hidden transition-opacity duration-300 ${
            sidebarCollapsed ? "pointer-events-none opacity-0 lg:block" : "opacity-100"
          }`}
        >
          <NavTree
            headings={selectedCategory?.headings ?? []}
            activeH1={activeH1}
            activeH2={activeH2}
            expandedSlugs={expandedSlugs}
            onH1Click={handleH1Click}
            onH2Click={handleH2Click}
          />
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="min-w-0 flex-1">
        {/* Mobile category tabs */}
        {docsIndex.length > 1 && (
          <div className="cat-scroll flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95 md:hidden">
            {docsIndex.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category.slug)}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  category.slug === catSlug
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Mobile sticky nav bar */}
        {activeH1 && (
          <div className="sticky top-14 z-30 flex items-center gap-3 border-b border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95 lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
              aria-label={labels.navigation}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {labels.navigation}
            </button>
            {activeTitle && (
              <p className="min-w-0 truncate text-xs text-gray-400 dark:text-gray-500">
                {selectedCategory?.name}
                {activeH1 && <> &rsaquo; {activeH1.title}</>}
                {activeH2 && <> &rsaquo; {activeH2.title}</>}
              </p>
            )}
          </div>
        )}

        {/* Category overview — shown when no heading is selected */}
        {!activeH1 && selectedCategory && (
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
            {/* Category header */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedCategory.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedCategory.headings.length} {labels.sections.toLowerCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 lg:hidden"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {labels.navigation}
              </button>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {selectedCategory.headings.map((h1, idx) => (
                <article
                  key={h1.id}
                  className="card-shimmer rounded-xl border border-teal-500/20 bg-white/95 p-4 shadow-sm dark:border-teal-400/20 dark:bg-gray-900/95"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-100 text-xs font-extrabold text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleH1Click(h1)}
                      className="min-w-0 text-start text-sm font-bold leading-snug text-gray-900 transition-colors hover:text-teal-700 dark:text-gray-100 dark:hover:text-teal-400"
                    >
                      {h1.title}
                    </button>
                  </div>

                  {h1.children.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {h1.children.map((h2) => (
                        <button
                          key={h2.id}
                          type="button"
                          onClick={() => handleH2Click(h1, h2)}
                          className="rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                        >
                          {h2.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                  )}
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="card-shimmer hidden overflow-hidden rounded-xl border border-teal-500/20 bg-white/95 shadow-glow transition-all duration-300 dark:border-teal-400/20 dark:bg-gray-900/95 md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-teal-100 bg-teal-50/30 dark:border-teal-900/50 dark:bg-teal-900/20">
                    <th className="w-10 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      #
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {labels.sections}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {labels.pages}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selectedCategory.headings.map((h1, idx) => (
                    <tr
                      key={h1.id}
                      className="group transition-all duration-300 hover:bg-teal-50/50 hover:shadow-inner dark:hover:bg-teal-900/20"
                    >
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-xs font-extrabold text-teal-700 shadow-sm transition-transform group-hover:scale-110 dark:bg-teal-900/60 dark:text-teal-300">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleH1Click(h1)}
                          className="font-bold text-gray-900 transition-colors group-hover:text-teal-700 dark:text-gray-100 dark:group-hover:text-teal-400"
                        >
                          {h1.title}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {h1.children.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {h1.children.map((h2) => (
                              <button
                                key={h2.id}
                                type="button"
                                onClick={() => handleH2Click(h1, h2)}
                                className="rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                              >
                                {h2.title}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && activeH1 && (
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="rounded-2xl border border-gray-200 bg-white/95 px-5 py-7 shadow-sm dark:border-gray-800 dark:bg-gray-900/95 sm:px-8 sm:py-8">
              <div className="h-8 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="mt-8 space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-11/12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="mt-6 aspect-video w-full animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        )}

        {/* Article */}
        {!loading && activeH1 && (
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="flex gap-4 lg:gap-8 xl:gap-10">
              {/* Main content */}
              <div className="min-w-0 flex-1">
                {/* Breadcrumb */}
                <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs text-gray-400 sm:text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{siteTitle}</span>
                  <span>/</span>
                  <span className="text-gray-500 dark:text-gray-400">{selectedCategory?.name}</span>
                  {activeH2 && (
                    <>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => { setActiveH2(null); loadContent(activeH1.id, activeH1.title); }}
                        className="hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        {activeH1.title}
                      </button>
                    </>
                  )}
                  <span>/</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{activeTitle}</span>
                </nav>

                <article className="card-shimmer rounded-2xl border border-teal-500/20 bg-white/95 px-5 py-7 shadow-glow transition-all duration-700 animate-glow backdrop-blur-sm dark:border-teal-400/20 dark:bg-gray-900/95 sm:px-8 sm:py-8">
                  <h1 className="mb-6 text-xl font-extrabold leading-snug text-gray-900 dark:text-white sm:mb-8 sm:text-2xl lg:text-3xl">
                    {activeTitle}
                  </h1>

                  {contents.length > 0 ? (
                    contents.map((c) => (
                      <div key={c.id}>
                        {c.description && (
                          <p className="mb-6 rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm leading-relaxed text-emerald-800 dark:border-emerald-700/30 dark:bg-emerald-900/15 dark:text-emerald-300">
                            {c.description}
                          </p>
                        )}
                        <div
                          className="prose prose-sm prose-gray max-w-none dark:prose-invert sm:prose-base prose-headings:scroll-mt-24 prose-headings:font-semibold prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-emerald-400 prose-code:rounded-md prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal prose-code:text-slate-800 dark:prose-code:bg-gray-800 dark:prose-code:text-gray-200 prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-200 prose-pre:bg-slate-100 prose-pre:text-slate-800 dark:prose-pre:border-gray-700 dark:prose-pre:bg-gray-900 dark:prose-pre:text-gray-100 [&_pre_code]:bg-transparent [&_pre_code]:text-inherit prose-img:rounded-xl prose-blockquote:border-l-emerald-400"
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                            components={{
                              h1: ({ children }) => linkedHeading(1, children, labels.copyCode),
                              h2: ({ children }) => linkedHeading(2, children, labels.copyCode),
                              h3: ({ children }) => linkedHeading(3, children, labels.copyCode),
                              h4: ({ children }) => linkedHeading(4, children, labels.copyCode),
                              pre: ({ children, className }) => (
                                <MarkdownPre copyLabel={labels.copyCode} copiedLabel={labels.copied} className={className}>
                                  {children}
                                </MarkdownPre>
                              ),
                              img: ({ src, alt, width, height }) => (
                                <a href={String(src || "")} target="_blank" rel="noreferrer" title={labels.openImage}>
                                  <img
                                    src={String(src || "")}
                                    alt={String(alt || "")}
                                    width={width ? Number(width) : undefined}
                                    height={height ? Number(height) : undefined}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </a>
                              ),
                            }}
                          >
                            {(() => {
                              const fileMarkers = (c.body.match(/<--file-->/g) || []).length;
                              const allAtts = c.attachments || [];
                              const inlineAtts = allAtts.slice(0, fileMarkers);
                              let rendered = c.images?.length ? injectImages(c.body, c.images) : c.body;
                              if (fileMarkers > 0) rendered = injectFiles(rendered, inlineAtts);
                              return rendered;
                            })()}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))
                  ) : activeH1 && activeH1.children.length > 0 && !activeH2 ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {activeH1.children.map((h2) => (
                        <button
                          key={h2.id}
                          type="button"
                          onClick={() => handleH2Click(activeH1, h2)}
                          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-start text-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20"
                        >
                          <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-medium text-gray-700 dark:text-gray-200">{h2.title}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">{labels.noContent}</p>
                  )}
                </article>
              </div>

              {/* Right ToC — "Bu Sayfada" */}
              {tocHeadings.length > 0 && (
                <aside className="hidden w-52 shrink-0 lg:block">
                  <div className="sticky top-24">
                    <div className="card-shimmer overflow-hidden rounded-xl border border-gray-200/80 bg-white/80 shadow-sm backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/50">
                      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700/50 px-4 py-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          {labels.tableOfContents}
                        </p>
                      </div>
                      <nav className="p-2 space-y-0.5">
                        {tocHeadings.map((h, i) => (
                          <a
                            key={i}
                            href={`#${h.id}`}
                            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs leading-snug transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 ${
                              h.level === 1
                                ? "font-semibold text-gray-800 dark:text-gray-100"
                                : h.level === 2
                                ? "pl-3 text-gray-600 dark:text-gray-300"
                                : "pl-5 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {h.level > 1 && <span className="shrink-0 h-px w-2 bg-current opacity-30 mt-px" />}
                            <span className="truncate">{h.text}</span>
                          </a>
                        ))}
                      </nav>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
