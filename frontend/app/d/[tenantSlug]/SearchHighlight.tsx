"use client";

export default function SearchHighlight({
  text,
  query,
  formatted,
}: {
  text: string;
  query: string;
  formatted?: string;
}) {
  if (formatted) {
    const chunks = formatted.split(/(<\/?em>)/g);
    let marked = false;
    return (
      <>
        {chunks.map((chunk, index) => {
          if (chunk === "<em>") {
            marked = true;
            return null;
          }
          if (chunk === "</em>") {
            marked = false;
            return null;
          }
          const clean = chunk.replace(/<[^>]+>/g, "");
          if (!clean) return null;
          return marked ? (
            <mark key={index} className="rounded bg-emerald-100 px-0.5 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
              {clean}
            </mark>
          ) : (
            <span key={index}>{clean}</span>
          );
        })}
      </>
    );
  }

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
