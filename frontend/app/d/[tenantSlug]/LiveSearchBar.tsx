"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Hit = {
  source_id: string;
  matched_text: string;
  context?: string;
  url?: string;
  category?: string;
  h1?: string;
  h2?: string;
};

export default function LiveSearchBar({
  tenantSlug,
  placeholder,
  allResultsLabel,
}: {
  tenantSlug: string;
  placeholder: string;
  allResultsLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function search(q: string) {
    if (q.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/search?q=${encodeURIComponent(q.trim())}&limit=8`);
      if (res.ok) {
        const data: Hit[] = await res.json();
        setHits(data);
        setOpen(true);
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
    timerRef.current = setTimeout(() => search(value), 250);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim().length >= 2) {
      setOpen(false);
      router.push(`/d/${tenantSlug}/search?q=${encodeURIComponent(query.trim())}`);
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
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {loading && (
          <svg className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm shadow-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-emerald-600"
        />
      </div>

      {open && (hits.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <ul>
            {hits.map((hit, i) => (
              <li key={`${hit.source_id}-${i}`}>
                <Link
                  href={hit.url || `/d/${tenantSlug}`}
                  onClick={() => { setOpen(false); setQuery(""); }}
                  className="flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <span className="mt-0.5 text-xs text-emerald-500 dark:text-emerald-400">{getIcon(hit)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                      {hit.matched_text || hit.h2 || hit.h1 || hit.category}
                    </p>
                    {hit.context && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">{hit.context}</p>
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
          </ul>
          <div className="border-t border-gray-100 dark:border-gray-800">
            <Link
              href={`/d/${tenantSlug}/search?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setOpen(false)}
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
