"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchHighlight from "../SearchHighlight";

type Hit = {
  source_id: string;
  matched_text: string;
  context?: string;
  url?: string;
  category?: string;
  h1?: string;
  h2?: string;
};

type Labels = {
  searchPlaceholder: string;
  search: string;
  typeTwoChars: string;
  noResult: string;
  backToDocs: string;
  searchTitle: string;
  allCategories: string;
  clearSearch: string;
  searchResults: string;
  searchError: string;
};

type CategoryOption = { id: string; name: string; slug: string };

export default function SearchPageClient({
  tenantSlug,
  initialQuery,
  initialCategory,
  initialHits,
  categories,
  labels,
}: {
  tenantSlug: string;
  initialQuery: string;
  initialCategory: string;
  initialHits: Hit[];
  categories: CategoryOption[];
  labels: Labels;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [hits, setHits] = useState<Hit[]>(initialHits);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "short" | "empty" | "results" | "error">(
    initialQuery.length >= 2
      ? initialHits.length > 0
        ? "results"
        : "empty"
      : initialQuery.length > 0
      ? "short"
      : "idle"
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function doSearch(q: string, nextCategory = category) {
    if (q.trim().length < 2) {
      setHits([]);
      setStatus(q.trim().length > 0 ? "short" : "idle");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), limit: "30" });
      if (nextCategory) params.set("category_slug", nextCategory);
      const res = await fetch(`/api/t/${tenantSlug}/search?${params.toString()}`);
      if (res.ok) {
        const data: Hit[] = await res.json();
        setHits(data);
        setStatus(data.length > 0 ? "results" : "empty");
        const nextUrlParams = new URLSearchParams({ q: q.trim() });
        if (nextCategory) nextUrlParams.set("category", nextCategory);
        router.replace(`/d/${tenantSlug}/search?${nextUrlParams.toString()}`, { scroll: false });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    doSearch(query, value).catch(() => {});
  }

  function breadcrumb(hit: Hit) {
    return [hit.category, hit.h1, hit.h2].filter(Boolean).join(" › ");
  }

  return (
    <div>
      {/* Search input */}
      <div className="mt-5 relative">
        <svg
          className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <svg className="absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        <input
          autoFocus
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="min-h-12 w-full rounded-xl border border-gray-300 bg-white ps-11 pe-12 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-emerald-600"
        />
      </div>

      {categories.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">{labels.allCategories}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          {(query || category) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("");
                setHits([]);
                setStatus("idle");
                router.replace(`/d/${tenantSlug}/search`, { scroll: false });
              }}
              className="min-h-11 rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {labels.clearSearch}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="mt-6 space-y-2">
        {status === "idle" && (
          <p className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {labels.typeTwoChars}
          </p>
        )}
        {status === "short" && (
          <p className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {labels.typeTwoChars}
          </p>
        )}
        {status === "empty" && !loading && (
          <p className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {labels.noResult} &ldquo;{query}&rdquo;
          </p>
        )}
        {status === "error" && !loading && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {labels.searchError}
          </p>
        )}
        {status === "results" && (
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {hits.length} {labels.searchResults}
          </p>
        )}
        {status === "results" &&
          hits.map((hit, i) => (
            <Link
              key={`${hit.source_id}-${i}`}
              href={hit.url || `/d/${tenantSlug}`}
              className="block rounded-xl border border-gray-200 p-4 transition hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-gray-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
            >
              {breadcrumb(hit) && (
                <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                  {breadcrumb(hit)}
                </p>
              )}
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                <SearchHighlight text={hit.matched_text || hit.h2 || hit.h1 || hit.category || ""} query={query} />
              </p>
              {hit.context && (
                <p className="mt-1.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                  <SearchHighlight text={hit.context} query={query} />
                </p>
              )}
            </Link>
          ))}
      </div>
    </div>
  );
}
