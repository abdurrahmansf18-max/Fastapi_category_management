import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit3, FolderTree, Trash2 } from "lucide-react";
import { cx, toUndef, sectionCard, itemCard, iconButton, paginate } from "../utils/uiHelpers";
import CreateCategoryForm from "../components/CreateCategoryForm";
import { ListControls, PaginationControls } from "../components/ListControls";
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cats;
    return cats.filter((category) =>
      `${category.name} ${category.description || ""} ${category.slug}`.toLowerCase().includes(needle)
    );
  }, [cats, query]);
  const paged = paginate(filtered, page, 12);

  return (
    <section className={sectionCard}>
      <div>
        <div className="mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
            <FolderTree className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t("categories")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {t("categories_desc")}
            </p>
          </div>
        </div>

        <ListControls
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder={t("search_placeholder")}
          countLabel={`${filtered.length} ${t("items")}`}
        />

        {cats.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">{t("no_category_yet")}</p>
            <p className="text-sm">{t("create_first_category")}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {paged.items.map((c) => (
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
                      className={iconButton}
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
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      className={iconButton}
                      onClick={() => deleteCategory(c.id)}
                      title={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
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
            <PaginationControls
              page={paged.page}
              pageCount={paged.pageCount}
              onPageChange={setPage}
              previousLabel={t("previous_page")}
              nextLabel={t("next_page")}
            />
          </div>
        )}

        <div className="mt-8">
          <CreateCategoryForm onCreate={createCategory} />
        </div>
      </div>
    </section>
  );
}
