"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type TocItem = { level: number; text: string; id: string };
export type NavItem = { id: string; title: string; slug: string };

export default function DocSidebar({
  toc,
  navItems,
  currentSlug,
  tenantSlug,
  categorySlug,
  h1Slug,
  navLabel,
  tocLabel,
}: {
  toc: TocItem[];
  navItems: NavItem[];
  currentSlug: string;
  tenantSlug: string;
  categorySlug: string;
  h1Slug: string;
  navLabel: string;
  tocLabel: string;
}) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? "");
  const intersecting = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) intersecting.current.add(e.target.id);
          else intersecting.current.delete(e.target.id);
        });
        // Pick topmost visible heading (first in toc order)
        for (const { id } of toc) {
          if (intersecting.current.has(id)) {
            setActiveId(id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -50% 0px", threshold: 0 }
    );

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      intersecting.current.clear();
    };
  }, [toc]);

  return (
    <div className="space-y-3">
      {/* Navigation — sibling pages */}
      {navItems.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {navLabel}
            </p>
          </div>
          <nav className="thin-scroll max-h-72 overflow-y-auto p-1.5">
            {navItems.map((item) => {
              const active = item.slug === currentSlug;
              return (
                <Link
                  key={item.id}
                  href={`/d/${tenantSlug}/${categorySlug}/${h1Slug}/${item.slug}`}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-200"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                      active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  <span className="min-w-0 truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Table of Contents */}
      {toc.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {tocLabel}
            </p>
          </div>
          <nav className="thin-scroll max-h-96 overflow-y-auto p-1.5">
            {toc.map((item, i) => {
              const active = activeId === item.id;
              return (
                <a
                  key={`${item.id}-${i}`}
                  href={`#${item.id}`}
                  className={`flex items-center gap-2 rounded-lg py-1.5 pr-3 text-sm transition-colors ${
                    active
                      ? "font-medium text-emerald-700 dark:text-emerald-400"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                >
                  <span
                    className={`h-px w-2.5 shrink-0 transition-colors ${
                      active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  <span className="truncate leading-snug">{item.text}</span>
                </a>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
