export function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const toUndef = (s: string | null | undefined) => {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
};

// Outer section container — white in light / gray-900 in dark
export const sectionCard = "section-card";

// Inner item tile — slate-50 in light / gray-950 in dark
export const itemCard = "item-card";

export const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 text-gray-600 transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-950";

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
  };
}
