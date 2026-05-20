import { useTranslation } from "react-i18next";
import { useState } from "react";

const TITLE_MAX = 80;
const SEO_DESC_MAX = 320;

export default function CreateH1Form({
  onCreate,
}: {
  onCreate: (title: string, description?: string, seoDescription?: string) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate(title.trim(), undefined, seoDescription.trim() || undefined);
        setTitle("");
        setSeoDescription("");
      }}
      className="mt-6 p-4 rounded-xl bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300/60 dark:border-gray-700/60 backdrop-blur-sm"
    >
      <div className="space-y-3">
        <div className="relative">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder={t("new_title_name")}
            className="w-full rounded-xl border border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80 px-4 py-2.5 pr-16 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums ${title.length >= TITLE_MAX ? "text-red-500" : title.length >= TITLE_MAX * 0.85 ? "text-amber-500" : "text-gray-400"}`}>
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <div className="relative">
          <input
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value.slice(0, SEO_DESC_MAX))}
            placeholder={t("heading_seo_description_optional")}
            className="w-full rounded-xl border border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80 px-4 py-2.5 pr-20 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums ${seoDescription.length >= SEO_DESC_MAX ? "text-red-500" : seoDescription.length >= SEO_DESC_MAX * 0.85 ? "text-amber-500" : "text-gray-400"}`}>
            {seoDescription.length}/{SEO_DESC_MAX}
          </span>
        </div>
        <button className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.01] text-sm">
          + {t("add_title")}
        </button>
      </div>
    </form>
  );
}
