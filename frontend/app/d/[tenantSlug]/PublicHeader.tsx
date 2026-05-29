import Link from "next/link";
import { House } from "lucide-react";
import { apiGet } from "../../lib/api";
import type { SiteSettings } from "../../lib/api";
import { publicCopy } from "../../lib/server-i18n";
import type { PublicLang } from "../../lib/server-i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import PublicSearchShortcut from "./PublicSearchShortcut";

type NavCategory = { id: string; name: string; slug: string };

export default async function PublicHeader({
  tenantSlug,
  settings,
  lang,
  currentCategorySlug,
  showDesktopCategories = true,
  showMobileCategories = true,
}: {
  tenantSlug: string;
  settings: SiteSettings;
  lang: PublicLang;
  currentCategorySlug?: string;
  showDesktopCategories?: boolean;
  showMobileCategories?: boolean;
}) {
  const labels = publicCopy[lang];
  const docsIndex = await apiGet<NavCategory[]>(`/t/${tenantSlug}/docs-index`, 120);
  const categories = docsIndex || [];
  const siteTitle = settings.site_title || tenantSlug;
  const initial = siteTitle.charAt(0).toUpperCase();
  const hasCategories = categories.length > 0;
  return (
    <>
      <PublicSearchShortcut tenantSlug={tenantSlug} />
      <header className="tenant-header sticky top-0 z-30 border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">

          {/* Logo + Title */}
          <Link href={`/d/${tenantSlug}`} className="flex shrink-0 items-center gap-2.5">
            {settings.site_logo ? (
              <img src={settings.site_logo} alt={siteTitle} className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/30" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">
                {initial}
              </div>
            )}
            <span className="max-w-[140px] truncate text-sm font-bold text-white sm:max-w-none sm:text-base">{siteTitle}</span>
          </Link>

          {/* Category Tabs — desktop, scrollable */}
          {hasCategories && showDesktopCategories && (
            <nav className="cat-scroll hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto pb-0.5 md:flex">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/d/${tenantSlug}?cat=${cat.slug}`}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    cat.slug === currentCategorySlug
                      ? "bg-white/20 text-white"
                      : "text-emerald-100 hover:bg-white/10 hover:text-white"
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
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs text-emerald-100 transition hover:bg-white/20 hover:text-white"
            aria-label={labels.search}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden sm:inline">{labels.search}</span>
            <kbd className="hidden rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-100 lg:inline">Ctrl K</kbd>
          </Link>

          {/* Platform Home */}
          <Link
            href="/"
            className="flex shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 p-1.5 text-emerald-100 transition hover:bg-white/20 hover:text-white"
            title={labels.backHome}
            aria-label={labels.backHome}
          >
            <House className="h-3.5 w-3.5" />
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle lightLabel={labels.switchToLight} darkLabel={labels.switchToDark} onDark />

          {/* Language Switcher */}
          <LanguageSwitcher current={lang} label={labels.changeLanguage} onDark />
        </div>

        {/* Mobile category tabs row */}
        {hasCategories && showMobileCategories && (
          <div className="cat-scroll flex items-center gap-0.5 overflow-x-auto border-t border-white/10 px-4 pb-2 pt-1.5 md:hidden">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/d/${tenantSlug}?cat=${cat.slug}`}
                className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  cat.slug === currentCategorySlug
                    ? "bg-white/20 text-white"
                    : "text-emerald-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
