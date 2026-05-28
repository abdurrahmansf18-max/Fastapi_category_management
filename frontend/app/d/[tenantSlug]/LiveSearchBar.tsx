"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchHighlight from "./SearchHighlight";

type Hit = {
  source_id: string;
  matched_text: string;
  context?: string;
  url?: string;
  category?: string;
  h1?: string;
  h2?: string;
  highlight?: Record<string, string>;
};

export default function LiveSearchBar({
  tenantSlug,
  placeholder,
  allResultsLabel,
  noResultLabel,
  searchErrorLabel,
}: {
  tenantSlug: string;
  placeholder: string;
  allResultsLabel: string;
  noResultLabel: string;
  searchErrorLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const historyKey = `docs_search_history:${tenantSlug}`;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      if (raw) setRecentSearches(JSON.parse(raw).slice(0, 5));
    } catch {
      setRecentSearches([]);
    }
  }, [historyKey]);

  function rememberSearch(value: string) {
    const nextQuery = value.trim();
    if (nextQuery.length < 2) return;
    setRecentSearches((current) => {
      const next = [nextQuery, ...current.filter((item) => item.toLowerCase() !== nextQuery.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(historyKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function search(q: string) {
    if (q.trim().length < 2) {
      setHits([]);
      setSuggestions([]);
      setOpen(recentSearches.length > 0);
      setActiveIndex(-1);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [res, suggestRes] = await Promise.all([
        fetch(`/api/t/${tenantSlug}/search?q=${encodeURIComponent(q.trim())}&limit=8`),
        fetch(`/api/t/${tenantSlug}/search/suggest?q=${encodeURIComponent(q.trim())}&limit=5`),
      ]);
      if (res.ok) {
        const data = (await res.json()) as Hit[];
        setHits(data);
        setOpen(true);
      }
      if (suggestRes.ok) {
        setSuggestions((await suggestRes.json()) as string[]);
      }
      setActiveIndex(-1);
    } catch {
      setError(true);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(value), 250);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const resultCount = hits.length;
    if (e.key === "ArrowDown" && open && resultCount > 0) {
      e.preventDefault();
      setActiveIndex((current) => (current + 1) % resultCount);
      return;
    }
    if (e.key === "ArrowUp" && open && resultCount > 0) {
      e.preventDefault();
      setActiveIndex((current) => (current <= 0 ? resultCount - 1 : current - 1));
      return;
    }
    if (e.key === "Enter" && query.trim().length >= 2) {
      setOpen(false);
      rememberSearch(query);
      const activeHit = activeIndex >= 0 ? hits[activeIndex] : null;
      router.push(activeHit?.url || `/d/${tenantSlug}/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === "Escape") setOpen(false);
  }

  function getIcon(hit: Hit) {
    if (hit.h2) return "↳";
    if (hit.h1) return "◈";
    return "◻";
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <svg className="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => (hits.length > 0 || recentSearches.length > 0) && setOpen(true)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white ps-10 pe-10 text-sm shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-emerald-600"
          role="combobox"
          aria-expanded={open}
          aria-controls="live-search-results"
        />
      </div>

      {open && (hits.length > 0 || suggestions.length > 0 || recentSearches.length > 0 || error || query.trim().length >= 2) && (
        <div id="live-search-results" className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 dark:text-red-300">{searchErrorLabel}</div>
          )}
          {!error && hits.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{noResultLabel}</div>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setQuery(suggestion);
                    rememberSearch(suggestion);
                    search(suggestion).catch(() => {});
                  }}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          {query.trim().length < 2 && recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 py-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuery(item);
                    search(item).catch(() => {});
                  }}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-300"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          {hits.length > 0 && <ul role="listbox">
            {hits.map((hit, i) => (
              <li key={`${hit.source_id}-${i}`}>
                <Link
                  href={hit.url || `/d/${tenantSlug}`}
                  onClick={() => { rememberSearch(query); setOpen(false); setQuery(""); }}
                  className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ${
                    activeIndex === i ? "bg-emerald-50 dark:bg-emerald-950/30" : ""
                  }`}
                  role="option"
                  aria-selected={activeIndex === i}
                >
                  <span className="mt-0.5 text-xs text-emerald-500 dark:text-emerald-400">{getIcon(hit)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                      <SearchHighlight text={hit.matched_text || hit.h2 || hit.h1 || hit.category || ""} query={query} formatted={hit.highlight?.title} />
                    </p>
                    {hit.context && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">
                        <SearchHighlight text={hit.context} query={query} formatted={hit.highlight?.description || hit.highlight?.body} />
                      </p>
                    )}
                    {(hit.h1 || hit.category) && (
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                        {[hit.category, hit.h1].filter(Boolean).join(" › ")}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>}
          <div className="border-t border-gray-100 dark:border-gray-800">
            <Link
              href={`/d/${tenantSlug}/search?q=${encodeURIComponent(query.trim())}`}
              onClick={() => { rememberSearch(query); setOpen(false); }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              {allResultsLabel}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
