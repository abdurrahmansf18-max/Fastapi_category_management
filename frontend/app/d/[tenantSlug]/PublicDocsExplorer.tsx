"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

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

type Labels = {
  categories: string;
  filterDocs: string;
  clearSearch: string;
  noResult: string;
  more: string;
  sections: string;
  pages: string;
};

function normalize(value: string) {
  return value.toLocaleLowerCase().trim();
}

export default function PublicDocsExplorer({
  tenantSlug,
  docsIndex,
  labels,
}: {
  tenantSlug: string;
  docsIndex: DocsIndexCategory[];
  labels: Labels;
}) {
  const [filter, setFilter] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(docsIndex.map((category, index) => [category.id, docsIndex.length <= 8 || index < 3]))
  );
  const query = normalize(filter);

  const visibleCategories = useMemo(() => {
    if (!query) return docsIndex;
    return docsIndex
      .map((category) => {
        const categoryMatches = normalize(category.name).includes(query);
        const headings = category.headings
          .map((heading) => {
            const headingMatches = normalize(heading.title).includes(query);
            const children = heading.children.filter((child) => normalize(child.title).includes(query));
            if (categoryMatches || headingMatches || children.length > 0) {
              return {
                ...heading,
                children: categoryMatches || headingMatches ? heading.children : children,
              };
            }
            return null;
          })
          .filter((heading): heading is DocsIndexHeading => Boolean(heading));

        if (categoryMatches || headings.length > 0) return { ...category, headings };
        return null;
      })
      .filter((category): category is DocsIndexCategory => Boolean(category));
  }, [docsIndex, query]);

  function toggleCategory(id: string) {
    setOpenCategories((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <section aria-labelledby="docs-explorer-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="docs-explorer-title" className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {labels.categories}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {docsIndex.length} {labels.categories.toLocaleLowerCase()}
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={labels.filterDocs}
            className="min-h-11 w-full rounded-xl border border-gray-200 bg-white ps-10 pe-10 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label={labels.clearSearch}
              title={labels.clearSearch}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {visibleCategories.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          {labels.noResult} &ldquo;{filter}&rdquo;
        </div>
      ) : (
        <div className="space-y-5">
          {visibleCategories.map((category) => {
            const open = query ? true : Boolean(openCategories[category.id]);
            const childCount = category.headings.reduce((count, heading) => count + heading.children.length, 0);

            return (
              <section
                key={category.id}
                id={category.slug}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm [content-visibility:auto] [contain-intrinsic-size:1px_420px] dark:border-gray-800 dark:bg-gray-900"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex min-h-14 w-full items-center gap-2.5 border-b border-gray-100 bg-gray-50/70 px-5 py-3.5 text-start transition hover:bg-gray-100/70 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800"
                  aria-expanded={open}
                  aria-controls={`category-panel-${category.id}`}
                >
                  <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-gray-800 dark:text-white">{category.name}</span>
                    <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                      {category.headings.length} {labels.sections}
                      {childCount > 0 ? ` - ${childCount} ${labels.pages}` : ""}
                    </span>
                  </span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {open && (
                  <div id={`category-panel-${category.id}`} className="grid gap-px bg-gray-100 dark:bg-gray-800 sm:grid-cols-2 lg:grid-cols-3">
                    {category.headings.map((heading) => (
                      <Link
                        key={heading.id}
                        href={`/d/${tenantSlug}/${category.slug}/${heading.slug}`}
                        className="group flex min-h-32 flex-col gap-2 bg-white p-4 transition-colors hover:bg-emerald-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 dark:bg-gray-900 dark:hover:bg-emerald-950/30"
                      >
                        <div className="flex items-start gap-2.5">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-semibold leading-snug text-gray-800 transition group-hover:text-emerald-700 dark:text-gray-100 dark:group-hover:text-emerald-400">
                            {heading.title}
                          </span>
                        </div>

                        {heading.children.length > 0 && (
                          <ul className="ms-6 space-y-1 border-s border-gray-100 ps-3 dark:border-gray-700">
                            {heading.children.slice(0, 5).map((child) => (
                              <li key={child.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                                <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span className="truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-500">
                                  {child.title}
                                </span>
                              </li>
                            ))}
                            {heading.children.length > 5 && (
                              <li className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                                +{heading.children.length - 5} {labels.more}
                              </li>
                            )}
                          </ul>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
