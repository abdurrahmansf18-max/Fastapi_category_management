"use client";

import { useState, useRef, useEffect } from "react";
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function changeLanguage(lng: string) {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem("appLanguage", lng);
      document.cookie = `NEXT_LOCALE=${lng}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    setOpen(false);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = i18n.language?.split("-")[0] || "tr";
  const currentLabel = LANGS.find((l) => l.code === current)?.label || "TR";

  if (variant === "glass") {
    return (
      <div ref={ref} className="relative">
        {/* Mobile: compact globe button → dropdown */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20 sm:hidden"
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-white/60" />
          {currentLabel}
        </button>

        {/* Mobile dropdown */}
        {open && (
          <div className="absolute end-0 top-full z-50 mt-1.5 min-w-[6rem] overflow-hidden rounded-xl border border-white/20 bg-gray-900/95 p-1 shadow-xl backdrop-blur-md sm:hidden">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => changeLanguage(code)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                  current === code
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Desktop: inline pill */}
        <div className="hidden items-center gap-0.5 rounded-full border border-white/20 bg-white/10 p-0.5 backdrop-blur-sm sm:inline-flex">
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
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Mobile: compact globe button → dropdown */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100/80 px-2 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200 dark:border-gray-700/80 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700 sm:hidden"
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
        {currentLabel}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1.5 min-w-[6rem] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:hidden">
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => changeLanguage(code)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                current === code
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Desktop: inline pill */}
      <div className="hidden items-center gap-0.5 rounded-full border border-gray-200 bg-gray-100/80 p-0.5 dark:border-gray-700/80 dark:bg-gray-800/80 sm:inline-flex">
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
    </div>
  );
}
