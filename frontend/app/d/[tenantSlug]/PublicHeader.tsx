import Link from "next/link";
import { apiGet } from "../../lib/api";
import type { SiteSettings } from "../../lib/api";
import { publicCopy } from "../../lib/server-i18n";
import type { PublicLang } from "../../lib/server-i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

type NavCategory = { id: string; name: string; slug: string };

export default async function PublicHeader({
  tenantSlug,
  settings,
  lang,
  currentCategorySlug,
}: {
  tenantSlug: string;
  settings: SiteSettings;
  lang: PublicLang;
  currentCategorySlug?: string;
}) {
  const labels = publicCopy[lang];
  const docsIndex = await apiGet<NavCategory[]>(`/t/${tenantSlug}/docs-index`, 120);
  const categories = docsIndex || [];
  const siteTitle = settings.site_title || tenantSlug;
  const initial = siteTitle.charAt(0).toUpperCase();
  const hasCategories = categories.length > 0;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">

        {/* Logo + Title */}
        <Link href={`/d/${tenantSlug}`} className="flex shrink-0 items-center gap-2.5">
          {settings.site_logo ? (
            <img src={settings.site_logo} alt={siteTitle} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {initial}
            </div>
          )}
          <span className="max-w-[140px] truncate text-sm font-bold text-gray-900 dark:text-white sm:max-w-none sm:text-base">{siteTitle}</span>
        </Link>

        {/* Category Tabs — desktop, scrollable */}
        {hasCategories && (
          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden md:flex">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/d/${tenantSlug}#${cat.slug}`}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  cat.slug === currentCategorySlug
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Push controls to right when no categories */}
        {!hasCategories && <div className="flex-1" />}

        {/* Search shortcut */}
        <Link
          href={`/d/${tenantSlug}/search`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-400 transition hover:border-emerald-300 hover:bg-white hover:text-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
          aria-label={labels.search}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline">{labels.search}</span>
          <kbd className="hidden rounded bg-gray-200 px-1 py-0.5 text-[10px] font-mono text-gray-400 dark:bg-gray-700 dark:text-gray-500 lg:inline">⌘K</kbd>
        </Link>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Language Switcher */}
        <LanguageSwitcher current={lang} />
      </div>

      {/* Mobile category tabs row */}
      {hasCategories && (
        <div className="flex items-center gap-0.5 overflow-x-auto border-t border-gray-100 px-4 py-1.5 [&::-webkit-scrollbar]:hidden dark:border-gray-800 md:hidden">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/d/${tenantSlug}#${cat.slug}`}
              className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                cat.slug === currentCategorySlug
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
