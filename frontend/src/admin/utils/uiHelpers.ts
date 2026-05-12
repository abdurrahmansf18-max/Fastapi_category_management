export function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const toUndef = (s: string | null | undefined) => {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
};

export const sectionCard =
  "rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5";

export const itemCard =
  "rounded-md border border-gray-200 bg-white p-3 transition-colors hover:border-emerald-500 dark:border-gray-800 dark:bg-gray-950";

export const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition-colors hover:border-emerald-600 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-emerald-950";

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
