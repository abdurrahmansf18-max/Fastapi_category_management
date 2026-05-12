import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export function ListControls({
  query,
  onQueryChange,
  placeholder,
  countLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  countLabel: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-950"
        />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{countLabel}</p>
    </div>
  );
}

export function PaginationControls({
  page,
  pageCount,
  onPageChange,
  previousLabel,
  nextLabel,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 disabled:opacity-40 dark:border-gray-700"
        aria-label={previousLabel}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {page}/{pageCount}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 disabled:opacity-40 dark:border-gray-700"
        aria-label={nextLabel}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
