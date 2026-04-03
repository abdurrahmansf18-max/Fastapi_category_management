import { useTranslation } from "react-i18next";
import { cx, sectionCard, itemCard } from "../utils/uiHelpers";
import ContentImageManager from "../components/ContentImageManager";
import CreateContentForm from "../components/CreateContentForm";
import { ContentsApi } from "../../shared/api/admin";
import type { Heading, Content, UUID, Category } from "../../shared/types/models";

interface ContentsViewProps {
  currentHeadingId: UUID | null;
  selectedContent: Content | null;
  setSelectedContent: (c: Content | null) => void;
  showNotification: (msg: string, type?: "error" | "success" | "warning") => void;
  contents: Content[];
  activeH1: Heading | null;
  h1s: Heading[];
  h2s: Heading[];
  fetchContentsByHeading: (headingId: UUID) => Promise<void>;
  showPrompt: (title: string, defaultValue?: string, message?: string) => Promise<string | null>;
  showConfirm: (title: string, message?: string) => Promise<boolean>;
  createContent: (headingId: UUID, body: string, images: any[], description?: string) => Promise<void>;
}

export default function ContentsView({
  currentHeadingId,
  selectedContent,
  setSelectedContent,
  showNotification,
  contents,
  activeH1,
  h1s,
  h2s,
  fetchContentsByHeading,
  showPrompt,
  showConfirm,
  createContent,
}: ContentsViewProps) {
  const { t } = useTranslation();

  return (
    <section className={sectionCard}>
      <div className="pointer-events-none absolute -inset-2 rounded-3xl opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-emerald-700/20 via-emerald-600/15 to-emerald-800/20" />

      <div className="relative z-10">
        <div className="font-bold mb-8 text-2xl flex items-center gap-4 text-gray-900 dark:text-white">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-800 flex items-center justify-center text-2xl text-white shadow-lg">
            📝
          </div>
          <div>
            <h2>{t('contents')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {t("contents_desc")}
            </p>
          </div>
        </div>

        {!currentHeadingId && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">📑</div>
            <p className="text-lg font-medium">{t("select_heading_first")}</p>
            <p className="text-sm">{t("select_heading_to_view_contents")}</p>
          </div>
        )}

        {currentHeadingId && (
          <>
            {selectedContent && (
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-100/80 dark:from-blue-900/20 dark:to-indigo-900/20 border border-dashed border-blue-300/60 dark:border-blue-700/60 backdrop-blur-sm">
                <div className="font-semibold mb-4 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">
                    🖼️
                  </span>{" "}
                  {t("image_management")}
                </div>
                <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-800/30 border border-blue-200/50 dark:border-blue-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t("image_instruction")}
                  </p>
                  <ContentImageManager
                    key={selectedContent.id}
                    contentId={selectedContent.id}
                    onNotification={showNotification}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {contents.map((c) => (
                <div key={c.id} className={itemCard}>
                  <div className="flex items-center justify-between gap-4">
                    <button
                      className={cx(
                        "font-bold text-left flex-1 truncate text-lg transition-all duration-300",
                        selectedContent?.id === c.id
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-gray-800 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400"
                      )}
                      onClick={() =>
                        setSelectedContent(
                          selectedContent?.id === c.id ? null : c
                        )
                      }
                      title={c.body}
                    >
                      {c.body.substring(0, 50)}...
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        className={cx(
                          "px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200",
                          selectedContent?.id === c.id
                            ? "bg-blue-500 text-white"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        )}
                        onClick={() =>
                          setSelectedContent(
                            selectedContent?.id === c.id ? null : c
                          )
                        }
                      >
                        🖼️ {t("manage_images")}
                      </button>
                      <button
                        onClick={async () => {
                          const newBody = await showPrompt(t("edit_content"), c.body, t("new_content_colon"));
                          if (newBody !== null) {
                            ContentsApi.update(c.id, { body: newBody })
                              .then(() => {
                                if (currentHeadingId)
                                  fetchContentsByHeading(currentHeadingId);
                                showNotification(
                                  t("content_updated_success"),
                                  "success"
                                );
                              })
                              .catch(() =>
                                showNotification(t("content_update_error"))
                              );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 font-medium transition-all duration-200"
                      >
                        ✏️ {t("edit")}
                      </button>
                      <button
                        onClick={async () => {
                          const confirmed = await showConfirm(t("delete_content"), t("delete_content_sure"));
                          if (confirmed) {
                            if (selectedContent?.id === c.id) {
                              setSelectedContent(null);
                            }

                            ContentsApi.remove(c.id)
                              .then(() => {
                                if (currentHeadingId)
                                  fetchContentsByHeading(currentHeadingId);
                                showNotification(
                                  t("content_deleted_success"),
                                  "success"
                                );
                              })
                              .catch(() =>
                                showNotification(t("content_delete_error"))
                              );
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium transition-all duration-200"
                      >
                        🗑️ {t("delete")}
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
          </>
        )}

        <div className="mt-8">
          {(activeH1 || currentHeadingId) && contents.length === 0 && (
            <CreateContentForm
              targetOptions={
                currentHeadingId
                  ? // Eğer bir başlık seçildiyse sadece o başlığı göster
                    [
                      ...h1s
                        .filter((h) => h.id === currentHeadingId)
                        .map((h) => ({ id: h.id, label: `📄 ${h.title}` })),
                      ...h2s
                        .filter((h) => h.id === currentHeadingId)
                        .map((h) => ({ id: h.id, label: `📑 ${h.title}` })),
                    ]
                  : // Değilse tüm başlıkları göster ama mantığa göre filtrele
                    [
                      // Ana başlık seçildiyse ve alt başlık yoksa ana başlığı göster
                      ...(activeH1 && h2s.length === 0
                        ? [
                            {
                              id: activeH1.id,
                              label: `📄 ${activeH1.title}`,
                            },
                          ]
                        : []),
                      // Alt başlıklar varsa onları göster
                      ...h2s.map((h) => ({
                        id: h.id,
                        label: `📑 ${h.title}`,
                      })),
                    ]
              }
              onCreate={createContent}
            />
          )}
        </div>
      </div>
    </section>
  );
}
