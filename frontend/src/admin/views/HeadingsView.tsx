import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit3, Heading2, Trash2 } from "lucide-react";
import { cx, toUndef, sectionCard, itemCard, iconButton, paginate } from "../utils/uiHelpers";
import CreateH1Form from "../components/CreateH1Form";
import CreateH2Form from "../components/CreateH2Form";
import { ListControls, PaginationControls } from "../components/ListControls";
import type { Category, Heading, Content, UUID } from "../../shared/types/models";

interface HeadingsViewProps {
  activeCat: Category | null;
  activeH1: Heading | null;
  setActiveH1: (h: Heading | null) => void;
  h1s: Heading[];
  h2s: Heading[];
  setH2s: (h: any[]) => void;
  setContents: (c: any[]) => void;
  contents: Content[];
  setCurrentHeadingId: (id: UUID | null) => void;
  fetchH2s: (h1Id: UUID) => Promise<void>;
  fetchContentsByHeading: (headingId: UUID) => Promise<void>;
  showPrompt: (title: string, defaultValue?: string, message?: string) => Promise<string | null>;
  updateHeading: (id: UUID, fields: any) => Promise<void>;
  deleteHeading: (id: UUID) => Promise<void>;
  createH1: (catId: UUID, title: string) => Promise<void>;
  createH2: (parentId: UUID, title: string) => Promise<void>;
}

export default function HeadingsView({
  activeCat,
  activeH1,
  setActiveH1,
  h1s,
  h2s,
  setH2s,
  setContents,
  contents,
  setCurrentHeadingId,
  fetchH2s,
  fetchContentsByHeading,
  showPrompt,
  updateHeading,
  deleteHeading,
  createH1,
  createH2,
}: HeadingsViewProps) {
  const { t } = useTranslation();
  const [h1Query, setH1Query] = useState("");
  const [h2Query, setH2Query] = useState("");
  const [h1Page, setH1Page] = useState(1);
  const [h2Page, setH2Page] = useState(1);
  const filteredH1 = useMemo(() => {
    const needle = h1Query.trim().toLowerCase();
    if (!needle) return h1s;
    return h1s.filter((heading) =>
      `${heading.title} ${heading.description || ""} ${heading.slug}`.toLowerCase().includes(needle)
    );
  }, [h1Query, h1s]);
  const filteredH2 = useMemo(() => {
    const needle = h2Query.trim().toLowerCase();
    if (!needle) return h2s;
    return h2s.filter((heading) =>
      `${heading.title} ${heading.description || ""} ${heading.slug}`.toLowerCase().includes(needle)
    );
  }, [h2Query, h2s]);
  const pagedH1 = paginate(filteredH1, h1Page, 12);
  const pagedH2 = paginate(filteredH2, h2Page, 12);

  return (
    <section className={sectionCard}>
      <div>
        <div className="mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
            <Heading2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('headings')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {t("headings_desc")}
            </p>
          </div>
        </div>

        {!activeCat && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">{t("select_category_first")}</p>
            <p className="text-sm">{t("select_category_to_view_headings")}</p>
          </div>
        )}

        {activeCat && (
          <>
            {/* L1 Headings */}
            <div className="mb-10">
              <div className="font-semibold mb-5 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-600" />
                <span>{t("main_headings")}</span>
              </div>
              <ListControls
                query={h1Query}
                onQueryChange={(value) => {
                  setH1Query(value);
                  setH1Page(1);
                }}
                placeholder={t("search_placeholder")}
                countLabel={`${filteredH1.length} ${t("items")}`}
              />

              {h1s.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-lg font-medium">
                    {t("no_heading_yet")}
                  </p>
                  <p className="text-sm">{t("create_first_heading")}</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {pagedH1.items.map((h) => (
                    <div key={h.id} className={itemCard}>
                      <div className="flex items-center justify-between gap-4">
                        <button
                          className={cx(
                            "font-bold text-left flex-1 truncate text-lg transition-all duration-300",
                            activeH1?.id === h.id
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-gray-800 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400"
                          )}
                          onClick={() => {
                            if (activeH1?.id === h.id) {
                              // If same heading is clicked, don't reset anything
                              return;
                            }
                            setActiveH1(h);
                            setH2s([]);
                            setContents([]);
                            setCurrentHeadingId(null);
                            fetchH2s(h.id).catch(() => {});
                          }}
                          title={h.title}
                        >
                          {h.title}
                        </button>

                        <div className="flex items-center gap-3">
                          <button
                            className={iconButton}
                            onClick={async () => {
                              const title = await showPrompt(t("edit_title_modal"), h.title || "", t("new_title"));
                              if (title === null) return;
                              const sort = await showPrompt(t("edit_order"), String(h.sort_order ?? 0), t("order_int"));
                              const description = await showPrompt(t("edit_description"), h.description || "", t("description_optional"));
                              updateHeading(h.id, {
                                title: title || h.title,
                                sort_order: Number(sort ?? h.sort_order),
                                description: toUndef(description),
                              }).catch(() => {});
                            }}
                            title={t('edit')}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <button
                            className={iconButton}
                            onClick={() => deleteHeading(h.id)}
                            title={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {h.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
                          {h.description}
                        </p>
                      )}
                    </div>
                  ))}
                  <PaginationControls
                    page={pagedH1.page}
                    pageCount={pagedH1.pageCount}
                    onPageChange={setH1Page}
                    previousLabel={t("previous_page")}
                    nextLabel={t("next_page")}
                  />
                </div>
              )}

              <div className="mt-8">
                {activeCat && (
                  <CreateH1Form
                    onCreate={(title) => createH1(activeCat.id, title)}
                  />
                )}
              </div>
            </div>

            {/* L2 Headings */}
            {activeH1 && (
              <div className="pt-8 border-t border-gray-200/40 dark:border-gray-800/40">
                <div className="font-semibold mb-5 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-700" />
                  <span>{t("sub_headings")}</span>
                </div>
                <ListControls
                  query={h2Query}
                  onQueryChange={(value) => {
                    setH2Query(value);
                    setH2Page(1);
                  }}
                  placeholder={t("search_placeholder")}
                  countLabel={`${filteredH2.length} ${t("items")}`}
                />

                {h2s.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg font-medium">{t("no_subheading_yet")}</p>
                    <p className="text-sm">{t("create_first_subheading")}</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {pagedH2.items.map((h) => (
                      <div key={h.id} className={itemCard}>
                        <div className="flex items-center justify-between gap-4">
                          <button
                            className="font-bold text-left flex-1 truncate text-lg text-gray-800 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-500 transition-all duration-300"
                            title={h.title}
                            onClick={() => {
                              fetchContentsByHeading(h.id).catch(() => {});
                            }}
                          >
                            {h.title}
                          </button>

                          <div className="flex items-center gap-3">
                            <button
                              className={iconButton}
                              onClick={async () => {
                                const title = await showPrompt(t("edit_subtitle"), h.title || "", t("new_subtitle"));
                                if (title === null) return;
                                const sort = await showPrompt(t("edit_order"), String(h.sort_order ?? 0), t("order_int"));
                                const description = await showPrompt(t("edit_description"), h.description || "", t("description_optional"));
                                updateHeading(h.id, {
                                  title: title || h.title,
                                  sort_order: Number(sort ?? h.sort_order),
                                  description: toUndef(description),
                                }).catch(() => {});
                              }}
                              title={t('edit')}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              className={iconButton}
                              onClick={() => deleteHeading(h.id)}
                              title={t('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {h.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 p-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
                            {h.description}
                          </p>
                        )}
                      </div>
                    ))}
                    <PaginationControls
                      page={pagedH2.page}
                      pageCount={pagedH2.pageCount}
                      onPageChange={setH2Page}
                      previousLabel={t("previous_page")}
                      nextLabel={t("next_page")}
                    />
                  </div>
                )}

                <div className="mt-8">
                  {contents.some((c) => c.heading_id === activeH1?.id) ? (
                    <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/60">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">
                            {t('h1_has_content')}
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            {t('h1_has_content_desc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <CreateH2Form
                      onCreate={(title) => createH2(activeH1.id, title)}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
