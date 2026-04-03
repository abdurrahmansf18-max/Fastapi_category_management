export function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const toUndef = (s: string | null | undefined) => {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
};

export const sectionCard =
  "group relative rounded-3xl border border-gray-200/40 dark:border-gray-800/40 " +
  "bg-gradient-to-br from-white/95 via-gray-50/90 to-gray-100/80 " +
  "dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/80 " +
  "p-8 transition-all duration-500 backdrop-blur-xl " +
  "hover:shadow-2xl hover:shadow-emerald-800/20 hover:border-emerald-700/50 " +
  "hover:scale-[1.01] hover:-translate-y-1";

export const itemCard =
  "relative p-6 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 " +
  "bg-gradient-to-r from-white/90 via-gray-50/80 to-gray-100/70 " +
  "dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-950/70 " +
  "transition-all duration-300 backdrop-blur-sm " +
  "hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-800/25 " +
  "hover:ring-2 hover:ring-emerald-700/50 hover:border-emerald-700/70 " +
  "hover:-translate-y-0.5 group";
