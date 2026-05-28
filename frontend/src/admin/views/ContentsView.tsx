import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit3, FileText, ImageIcon, Paperclip, Trash2, X } from "lucide-react";
import { cx, sectionCard, itemCard, iconButton, paginate } from "../utils/uiHelpers";
import ContentImageManager from "../components/ContentImageManager";
import ContentAttachmentManager from "../components/ContentAttachmentManager";
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
    attachments: any[],
    description?: string,
    status?: "draft" | "published"
  ) => Promise<void>;
}

type MediaTab = "images" | "attachments";

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
  const [mediaTab, setMediaTab] = useState<MediaTab>("images");

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
        {/* Section header */}
        <div className="mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t("contents")}</h2>
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
            {/* ── Selected content: media panel (tabbed, compact) ── */}
            {selectedContent && (
              <div className="mb-6 rounded-2xl border border-blue-200/60 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-900/10 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200/50 dark:border-blue-800/50">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 min-w-0">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {selectedContent.body.substring(0, 40)}
                      {selectedContent.body.length > 40 ? "…" : ""}
                    </span>
                  </span>
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="ml-2 shrink-0 rounded-md p-1 text-gray-400 hover:bg-blue-100 hover:text-gray-600 dark:hover:bg-blue-900/40 dark:hover:text-gray-300 transition-colors"
                    title={t("close")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tab bar */}
                <div className="flex border-b border-blue-200/50 dark:border-blue-800/50">
                  <button
                    onClick={() => setMediaTab("images")}
                    className={cx(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                      mediaTab === "images"
                        ? "bg-white dark:bg-gray-800/60 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {t("content_images")}
                  </button>
                  <button
                    onClick={() => setMediaTab("attachments")}
                    className={cx(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                      mediaTab === "attachments"
                        ? "bg-white dark:bg-gray-800/60 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    )}
                  >
                    <Paperclip className="h-4 w-4" />
                    {t("attachments")}
                  </button>
                </div>

                {/* Tab content */}
                <div className="p-4">
                  {mediaTab === "images" ? (
                    <ContentImageManager
                      key={`img-${selectedContent.id}`}
                      contentId={selectedContent.id}
                      onNotification={showNotification}
                    />
                  ) : (
                    <ContentAttachmentManager
                      key={`att-${selectedContent.id}`}
                      contentId={selectedContent.id}
                      onNotification={showNotification}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Content list */}
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
                  <div className="flex items-start justify-between gap-3">
                    {/* Content preview text */}
                    <button
                      className={cx(
                        "font-bold text-left flex-1 min-w-0 text-base leading-snug transition-all duration-300",
                        selectedContent?.id === c.id
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-gray-800 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400"
                      )}
                      onClick={() =>
                        setSelectedContent(selectedContent?.id === c.id ? null : c)
                      }
                      title={c.body}
                    >
                      <span className="line-clamp-2">{c.body.substring(0, 80)}{c.body.length > 80 ? "…" : ""}</span>
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Publish/Draft toggle */}
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
                        className="hidden sm:block min-h-8 rounded-md border border-gray-300 px-2 text-xs font-semibold text-gray-700 hover:border-emerald-600 dark:border-gray-700 dark:text-gray-300 whitespace-nowrap"
                      >
                        {c.status === "draft" ? t("publish_now") : t("save_as_draft")}
                      </button>

                      {/* Image/attachment manager toggle */}
                      <button
                        className={cx(
                          "inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                          selectedContent?.id === c.id
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 text-blue-700 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:text-blue-300 dark:hover:bg-blue-950"
                        )}
                        onClick={() =>
                          setSelectedContent(selectedContent?.id === c.id ? null : c)
                        }
                        title={t("image_management")}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={async () => {
                          const newBody = await showPrompt(t("edit_content"), c.body, t("new_content_colon"));
                          if (newBody !== null) {
                            const newDescription = await showPrompt(
                              t("edit_description"),
                              c.description || "",
                              t("description_optional")
                            );
                            ContentsApi.update(c.id, { body: newBody, description: newDescription ?? c.description ?? null })
                              .then(() => {
                                if (currentHeadingId) fetchContentsByHeading(currentHeadingId);
                                showNotification(t("content_updated_success"), "success");
                              })
                              .catch(() => showNotification(t("content_update_error")));
                          }
                        }}
                        className={iconButton}
                        title={t("edit")}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={async () => {
                          const confirmed = await showConfirm(t("delete_content"), t("delete_content_sure"));
                          if (confirmed) {
                            if (selectedContent?.id === c.id) setSelectedContent(null);
                            ContentsApi.remove(c.id)
                              .then(() => {
                                if (currentHeadingId) fetchContentsByHeading(currentHeadingId);
                                showNotification(t("content_deleted_success"), "success");
                              })
                              .catch(() => showNotification(t("content_delete_error")));
                          }
                        }}
                        className={iconButton}
                        title={t("delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status badge + mobile publish toggle */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {c.status === "draft" ? t("status_draft") : t("status_published")}
                    </span>
                    {/* Mobile-only publish toggle (hidden on sm+) */}
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
                      className="sm:hidden min-h-7 rounded-md border border-gray-300 px-2 text-xs font-medium text-gray-600 hover:border-emerald-600 dark:border-gray-700 dark:text-gray-400"
                    >
                      {c.status === "draft" ? t("publish_now") : t("save_as_draft")}
                    </button>
                    {c.description && (
                      <p className="w-full text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                        {c.description}
                      </p>
                    )}
                  </div>
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

        {/* Create form */}
        <div className="mt-8">
          {(activeH1 || currentHeadingId) && contents.length === 0 && (
            <CreateContentForm
              targetOptions={
                currentHeadingId
                  ? [
                      ...h1s
                        .filter((h) => h.id === currentHeadingId)
                        .map((h) => ({ id: h.id, label: h.title })),
                      ...h2s
                        .filter((h) => h.id === currentHeadingId)
                        .map((h) => ({ id: h.id, label: h.title })),
                    ]
                  : [
                      ...(activeH1 && h2s.length === 0
                        ? [{ id: activeH1.id, label: activeH1.title }]
                        : []),
                      ...h2s.map((h) => ({ id: h.id, label: h.title })),
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
