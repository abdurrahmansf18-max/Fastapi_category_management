"use client";

export default function SearchHighlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return <>{text}</>;

  const index = text.toLocaleLowerCase().indexOf(cleanQuery.toLocaleLowerCase());
  if (index < 0) return <>{text}</>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + cleanQuery.length);
  const after = text.slice(index + cleanQuery.length);

  return (
    <>
      {before}
      <mark className="rounded bg-emerald-100 px-0.5 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
        {match}
      </mark>
      {after}
    </>
  );
}
