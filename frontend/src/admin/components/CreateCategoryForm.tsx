import { useState } from "react";
import { useTranslation } from "react-i18next";

const NAME_MAX = 60;
const SEO_DESC_MAX = 320;

export default function CreateCategoryForm({
  onCreate,
}: {
  onCreate: (name: string, description?: string, seoDescription?: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name.trim(), undefined, seoDesc.trim() || undefined);
        setName("");
        setSeoDesc("");
      }}
      className="mt-8 p-5 rounded-xl bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300/60 dark:border-gray-700/60 backdrop-blur-sm"
    >
      <div className="font-semibold mb-4 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <span className="text-emerald-600 dark:text-emerald-400">+</span> {t("add_new_category")}
      </div>
      <div className="space-y-3">
        <div className="relative">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
            placeholder={t('category_name')}
            className="w-full rounded-xl border border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80 px-4 py-3 pr-16 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums ${name.length >= NAME_MAX ? "text-red-500" : name.length >= NAME_MAX * 0.8 ? "text-amber-500" : "text-gray-400"}`}>
            {name.length}/{NAME_MAX}
          </span>
        </div>
        <div className="relative">
          <input
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value.slice(0, SEO_DESC_MAX))}
            placeholder={t("category_seo_description_optional")}
            className="w-full rounded-xl border border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80 px-4 py-3 pr-20 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono tabular-nums ${seoDesc.length >= SEO_DESC_MAX ? "text-red-500" : seoDesc.length >= SEO_DESC_MAX * 0.8 ? "text-amber-500" : "text-gray-400"}`}>
            {seoDesc.length}/{SEO_DESC_MAX}
          </span>
        </div>
        <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2">
          <span>+</span> {t("add_category")}
        </button>
      </div>
    </form>
  );
}
