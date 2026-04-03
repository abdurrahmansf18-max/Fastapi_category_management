import { useTranslation } from "react-i18next";
import { cx, toUndef, sectionCard, itemCard } from "../utils/uiHelpers";
import CreateH1Form from "../components/CreateH1Form";
import CreateH2Form from "../components/CreateH2Form";
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

  return (
    <section className={sectionCard}>
      <div className="pointer-events-none absolute -inset-2 rounded-3xl opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-emerald-700/20 via-emerald-600/15 to-emerald-800/20" />

      <div className="relative z-10">
        <div className="font-bold mb-8 text-2xl flex items-center gap-4 text-gray-900 dark:text-white">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-800 flex items-center justify-center text-2xl text-white shadow-lg">
            📑
          </div>
          <div>
            <h2>{t('headings')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {t("headings_desc")}
            </p>
          </div>
        </div>

        {!activeCat && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">📁</div>
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

              {h1s.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-lg font-medium">
                    {t("no_heading_yet")}
                  </p>
                  <p className="text-sm">{t("create_first_heading")}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {h1s.map((h) => (
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
                            className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-emerald-500/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:scale-105 transition-all duration-200"
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
                            ✏️
                          </button>

                          <button
                            className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-rose-400/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:scale-105 transition-all duration-200"
                            onClick={() => deleteHeading(h.id)}
                            title={t('delete')}
                          >
                            🗑️
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

                {h2s.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-3">📑</div>
                    <p className="text-lg font-medium">{t("no_subheading_yet")}</p>
                    <p className="text-sm">{t("create_first_subheading")}</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {h2s.map((h) => (
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
                              className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-emerald-600/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:scale-105 transition-all duration-200"
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
                              ✏️
                            </button>

                            <button
                              className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-rose-400/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:scale-105 transition-all duration-200"
                              onClick={() => deleteHeading(h.id)}
                              title={t('delete')}
                            >
                              🗑️
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
                  </div>
                )}

                <div className="mt-8">
                  {contents.some((c) => c.heading_id === activeH1?.id) ? (
                    <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/60">
                      <div className="flex items-center gap-3">
                        <span className="text-amber-600 dark:text-amber-400 text-lg">
                          ⚠️
                        </span>
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
