"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

const copy = {
  tr: { copy: "Linki kopyala", copied: "Kopyalandı" },
  en: { copy: "Copy link", copied: "Copied" },
  ar: { copy: "نسخ الرابط", copied: "تم النسخ" },
};

function currentLanguage(): keyof typeof copy {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem("appLanguage");
  if (saved === "tr" || saved === "en" || saved === "ar") return saved;
  const lang = window.navigator.language.toLowerCase();
  if (lang.startsWith("ar")) return "ar";
  if (lang.startsWith("en")) return "en";
  return "tr";
}

export default function CopyPageLinkButton() {
  const [copied, setCopied] = useState(false);
  const labels = copy[currentLanguage()];

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      aria-label={copied ? labels.copied : labels.copy}
      title={copied ? labels.copied : labels.copy}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <LinkIcon className="h-4 w-4" />}
      <span className="hidden sm:inline">{copied ? labels.copied : labels.copy}</span>
    </button>
  );
}
