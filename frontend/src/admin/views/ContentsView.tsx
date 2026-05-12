import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit3, FileText, ImageIcon, Trash2 } from "lucide-react";
import { cx, sectionCard, itemCard, iconButton, paginate } from "../utils/uiHelpers";
import ContentImageManager from "../components/ContentImageManager";
import CreateContentForm from "../components/CreateContentForm";
import { ListControls, PaginationControls } from "../components/ListControls";
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
  createContent: (
    headingId: UUID,
    body: string,
    images: any[],
    description?: string,
    status?: "draft" | "published"
  ) => Promise<void>;
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return contents;
    return contents.filter((content) =>
      `${content.body} ${content.description || ""}`.toLowerCase().includes(needle)
    );
  }, [contents, query]);
  const paged = paginate(filtered, page, 10);

  return (
    <section className={sectionCard}>
      <div>
        <div className="mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('contents')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {t("contents_desc")}
            </p>
          </div>
        </div>

        {!currentHeadingId && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">{t("select_heading_first")}</p>
            <p className="text-sm">{t("select_heading_to_view_contents")}</p>
          </div>
        )}

        {currentHeadingId && (
          <>
            {selectedContent && (
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-100/80 dark:from-blue-900/20 dark:to-indigo-900/20 border border-dashed border-blue-300/60 dark:border-blue-700/60 backdrop-blur-sm">
                <div className="font-semibold mb-4 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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

            <ListControls
              query={query}
              onQueryChange={(value) => {
                setQuery(value);
                setPage(1);
          }}
          placeholder={t("search_placeholder")}
          countLabel={`${filtered.length} ${t("items")}`}
        />

            <div className="grid gap-2">
              {paged.items.map((c) => (
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

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const nextStatus = c.status === "draft" ? "published" : "draft";
                          ContentsApi.update(c.id, { status: nextStatus })
                            .then(() => {
                              if (currentHeadingId) fetchContentsByHeading(currentHeadingId);
                              showNotification(
                                nextStatus === "published" ? t("status_published") : t("status_draft"),
                                "success"
                              );
                            })
                            .catch(() => showNotification(t("content_update_error")));
                        }}
                        className="min-h-10 rounded-md border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:border-emerald-600 dark:border-gray-700 dark:text-gray-300"
                      >
                        {c.status === "draft" ? t("publish_now") : t("save_as_draft")}
                      </button>
                      <button
                        className={cx(
                          "inline-flex h-10 w-10 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                          selectedContent?.id === c.id
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 text-blue-700 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:text-blue-300 dark:hover:bg-blue-950"
                        )}
                        onClick={() =>
                          setSelectedContent(
                            selectedContent?.id === c.id ? null : c
                          )
                        }
                      >
                        <ImageIcon className="h-4 w-4" />
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
                        className={iconButton}
                        title={t("edit")}
                      >
                        <Edit3 className="h-4 w-4" />
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
                        className={iconButton}
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
                  <span className="mt-3 inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {c.status === "draft" ? t("status_draft") : t("status_published")}
                  </span>
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
          </>
        )}

        <div className="mt-8">
          {(activeH1 || currentHeadingId) && contents.length === 0 && (
            <CreateContentForm
              targetOptions={
                currentHeadingId
                  ? // When a heading is selected, only show that heading.
                    [
                      ...h1s
                        .filter((h) => h.id === currentHeadingId)
                        .map((h) => ({ id: h.id, label: h.title })),
                      ...h2s
                        .filter((h) => h.id === currentHeadingId)
                        .map((h) => ({ id: h.id, label: h.title })),
                    ]
                  : // Otherwise show eligible headings for the active context.
                    [
                      // If the main heading has no subheadings, content can attach to it.
                      ...(activeH1 && h2s.length === 0
                        ? [
                            {
                              id: activeH1.id,
                              label: activeH1.title,
                            },
                          ]
                        : []),
                      ...h2s.map((h) => ({
                        id: h.id,
                        label: h.title,
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
