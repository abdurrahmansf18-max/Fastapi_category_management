"use client";

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LANGS = [
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
];

interface LanguageSwitcherProps {
  compact?: boolean;
  /** "default" → light/dark aware pill. "glass" → beyaz cam (koyu arka plan için). */
  variant?: "default" | "glass";
}

export default function LanguageSwitcher({
  compact = false,
  variant = "default",
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  function changeLanguage(lng: string) {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem("appLanguage", lng);
      document.cookie = `NEXT_LOCALE=${lng}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  }

  const current = i18n.language?.split("-")[0] || "tr";

  if (variant === "glass") {
    return (
      <div className="inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-white/10 p-0.5 backdrop-blur-sm">
        <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-white/50" />
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => changeLanguage(code)}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
              current === code
                ? "bg-white text-gray-900 shadow-sm"
                : "text-white/70 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-100/80 p-0.5 dark:border-gray-700/80 dark:bg-gray-800/80">
      <Globe className="ml-1.5 h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => changeLanguage(code)}
          className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
            current === code
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
