"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
};

export default function SearchPageClient({
  tenantSlug,
  initialQuery,
  initialHits,
  labels,
}: {
  tenantSlug: string;
  initialQuery: string;
  initialHits: Hit[];
  labels: Labels;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<Hit[]>(initialHits);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "short" | "empty" | "results">(
    initialQuery.length >= 2
      ? initialHits.length > 0
        ? "results"
        : "empty"
      : initialQuery.length > 0
      ? "short"
      : "idle"
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function doSearch(q: string) {
    if (q.trim().length < 2) {
      setHits([]);
      setStatus(q.trim().length > 0 ? "short" : "idle");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/t/${tenantSlug}/search?q=${encodeURIComponent(q.trim())}&limit=30`
      );
      if (res.ok) {
        const data: Hit[] = await res.json();
        setHits(data);
        setStatus(data.length > 0 ? "results" : "empty");
        // Update URL without navigating
        router.replace(`/d/${tenantSlug}/search?q=${encodeURIComponent(q.trim())}`, {
          scroll: false,
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), 300);
  }

  function breadcrumb(hit: Hit) {
    return [hit.category, hit.h1, hit.h2].filter(Boolean).join(" › ");
  }

  return (
    <div>
      {/* Search input */}
      <div className="mt-5 relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        <input
          autoFocus
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="min-h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-12 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-emerald-600"
        />
      </div>

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
                {hit.matched_text || hit.h2 || hit.h1 || hit.category}
              </p>
              {hit.context && (
                <p className="mt-1.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                  {hit.context}
                </p>
              )}
            </Link>
          ))}
      </div>
    </div>
  );
}
