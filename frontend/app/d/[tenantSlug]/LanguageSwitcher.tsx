"use client";

import { Globe } from "lucide-react";

const LANGS = [
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
] as const;

type LangCode = "tr" | "en" | "ar";

export default function LanguageSwitcher({
  current,
  label,
  onDark,
}: {
  current: LangCode;
  label: string;
  onDark?: boolean;
}) {
  function select(code: LangCode) {
    if (code === current) return;
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  }

  if (onDark) {
    /* Glass pill — koyu arka plan (emerald header) için */
    return (
      <div
        className="inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-white/10 p-0.5 backdrop-blur-sm"
        title={label}
        aria-label={label}
      >
        <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-white/50" />
        {LANGS.map(({ code, label: lbl }) => (
          <button
            key={code}
            type="button"
            onClick={() => select(code)}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
              current === code
                ? "bg-white text-gray-900 shadow-sm"
                : "text-white/70 hover:text-white"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    );
  }

  /* Default pill — açık arka plan için */
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-100/80 p-0.5 dark:border-gray-700/80 dark:bg-gray-800/80"
      title={label}
      aria-label={label}
    >
      <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
      {LANGS.map(({ code, label: lbl }) => (
        <button
          key={code}
          type="button"
          onClick={() => select(code)}
          className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
            current === code
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}
