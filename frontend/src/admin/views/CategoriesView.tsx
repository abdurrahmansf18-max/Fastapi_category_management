import { useTranslation } from "react-i18next";
import { cx, toUndef, sectionCard, itemCard } from "../utils/uiHelpers";
import CreateCategoryForm from "../components/CreateCategoryForm";
import type { Category, UUID } from "../../shared/types/models";

interface CategoriesViewProps {
  cats: Category[];
  activeCat: Category | null;
  setActiveCat: (c: Category | null) => void;
  setActiveH1: (h: null) => void;
  setH2s: (h: any[]) => void;
  setContents: (c: any[]) => void;
  setCurrentHeadingId: (id: UUID | null) => void;
  fetchH1s: (catId: UUID) => Promise<void>;
  showPrompt: (title: string, defaultValue?: string, message?: string) => Promise<string | null>;
  updateCategory: (id: UUID, fields: any) => Promise<void>;
  deleteCategory: (id: UUID) => Promise<void>;
  createCategory: (name: string, description?: string) => Promise<void>;
}

export default function CategoriesView({
  cats,
  activeCat,
  setActiveCat,
  setActiveH1,
  setH2s,
  setContents,
  setCurrentHeadingId,
  fetchH1s,
  showPrompt,
  updateCategory,
  deleteCategory,
  createCategory,
}: CategoriesViewProps) {
  const { t } = useTranslation();

  return (
    <section className={sectionCard}>
      <div className="pointer-events-none absolute -inset-2 rounded-3xl opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-emerald-700/20 via-emerald-600/15 to-emerald-800/20" />

      <div className="relative z-10">
        <div className="font-bold mb-8 text-2xl flex items-center gap-4 text-gray-900 dark:text-white">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-800 flex items-center justify-center text-2xl text-white shadow-lg">
            📁
          </div>
          <div>
            <h2>{t("categories")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {t("categories_desc")}
            </p>
          </div>
        </div>

        {cats.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">📂</div>
            <p className="text-lg font-medium">{t("no_category_yet")}</p>
            <p className="text-sm">{t("create_first_category")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {cats.map((c) => (
              <div key={c.id} className={itemCard}>
                <div className="flex items-center gap-4 justify-between">
                  <button
                    className={cx(
                      "font-bold text-left flex-1 truncate text-lg transition-all duration-300",
                      activeCat?.id === c.id
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-gray-800 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400"
                    )}
                    onClick={() => {
                      setActiveCat(c);
                      setActiveH1(null);
                      setH2s([]);
                      setContents([]);
                      setCurrentHeadingId(null);
                      fetchH1s(c.id).catch(() => {});
                    }}
                    title={c.name}
                  >
                    {c.name}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-emerald-600/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:scale-105 transition-all duration-200"
                      onClick={async () => {
                        const name = await showPrompt(
                          t("edit_category"),
                          c.name || "",
                          t("new_category_name")
                        );
                        if (name === null) return;
                        const sort = await showPrompt(
                          t("edit_order"),
                          String(c.sort_order ?? 0),
                          t("order_int")
                        );
                        const description = await showPrompt(
                          t("edit_description"),
                          c.description || "",
                          t("description_optional")
                        );
                        updateCategory(c.id, {
                          name: name || c.name,
                          sort_order: Number(sort ?? c.sort_order),
                          description: toUndef(description),
                        }).catch(() => {});
                      }}
                      title={t("edit")}
                    >
                      ✏️
                    </button>

                    <button
                      className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-rose-400/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:scale-105 transition-all duration-200"
                      onClick={() => deleteCategory(c.id)}
                      title={t("delete")}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                {c.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
                    {c.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <CreateCategoryForm onCreate={createCategory} />
        </div>
      </div>
    </section>
  );
}
