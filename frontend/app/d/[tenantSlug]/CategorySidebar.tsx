import Link from "next/link";

type SidebarHeading = {
  id: string;
  title: string;
  slug: string;
  children: { id: string; title: string; slug: string }[];
};

export default function CategorySidebar({
  tenantSlug,
  categorySlug,
  headings,
  currentH1Slug,
  currentH2Slug,
}: {
  tenantSlug: string;
  categorySlug: string;
  headings: SidebarHeading[];
  currentH1Slug: string;
  currentH2Slug?: string;
}) {
  return (
    <aside className="hidden lg:block w-56 xl:w-60 shrink-0">
      <div className="sticky top-16 thin-scroll max-h-[calc(100vh-4rem)] overflow-y-auto py-6 pe-2">
        <nav aria-label="Document navigation">
          {headings.map((h1) => {
            const isActiveH1 = h1.slug === currentH1Slug;
            return (
              <div key={h1.id} className="mb-0.5">
                <Link
                  href={`/d/${tenantSlug}/${categorySlug}/${h1.slug}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActiveH1
                      ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-400"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate leading-snug">{h1.title}</span>
                  {h1.children.length > 0 && (
                    <svg
                      className={`h-3 w-3 shrink-0 transition-transform ${
                        isActiveH1 ? "rotate-90 text-emerald-500" : "text-gray-400 dark:text-gray-500"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </Link>

                {/* Expand H2 children when this H1 is active */}
                {isActiveH1 && h1.children.length > 0 && (
                  <div className="ms-3 mt-0.5 border-s-2 border-emerald-200 ps-2.5 dark:border-emerald-800/60">
                    {h1.children.map((h2) => {
                      const isActiveH2 = h2.slug === currentH2Slug;
                      return (
                        <Link
                          key={h2.id}
                          href={`/d/${tenantSlug}/${categorySlug}/${h1.slug}/${h2.slug}`}
                          className={`mb-0.5 flex items-center rounded-md px-2.5 py-1.5 text-xs leading-snug transition-colors ${
                            isActiveH2
                              ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-400"
                              : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          }`}
                        >
                          {h2.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
