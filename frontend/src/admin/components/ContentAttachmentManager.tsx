"use client";

import { useEffect, useState } from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContentAttachmentsApi } from "../../shared/api/admin";
import { localizeBackendError } from "../../shared/utils/localizeError";
import type { ContentAttachment, UUID } from "../../shared/types/models";

interface ContentAttachmentManagerProps {
  contentId: UUID;
  onNotification: (message: string, type?: "error" | "success" | "warning") => void;
}

export default function ContentAttachmentManager({
  contentId,
  onNotification,
}: ContentAttachmentManagerProps) {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState<ContentAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function fetchAttachments() {
    setLoading(true);
    try {
      const rows = await ContentAttachmentsApi.list(contentId);
      setAttachments(rows);
    } catch {
      onNotification(t("attachment_list_error"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAttachments([]);
    setLabel("");
    setSortOrder(0);
    setSelectedFile(null);
    fetchAttachments();
  }, [contentId]);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function addAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      setUploading(true);
      await ContentAttachmentsApi.upload(selectedFile, contentId, label.trim() || undefined, sortOrder);
      setSelectedFile(null);
      setLabel("");
      setSortOrder(0);
      const fileInput = document.getElementById("attachment-file-input") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await fetchAttachments();
      onNotification(t("attachment_added"), "success");
    } catch (error: any) {
      onNotification(localizeBackendError(error?.message, t) || t("attachment_add_error"), "error");
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(id: UUID) {
    try {
      await ContentAttachmentsApi.remove(id);
      await fetchAttachments();
      onNotification(t("attachment_deleted"), "success");
    } catch {
      onNotification(t("attachment_delete_error"), "error");
    }
  }

  async function updateSort(id: UUID, nextSort: number) {
    try {
      await ContentAttachmentsApi.update(id, { sort_order: nextSort });
      await fetchAttachments();
    } catch {
      onNotification(t("attachment_update_error"), "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <Paperclip className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        {t("attachments")}
      </div>

      <form
        onSubmit={addAttachment}
        className="rounded-xl border border-gray-200/60 bg-white/80 p-4 dark:border-gray-700/60 dark:bg-gray-800/70"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            id="attachment-file-input"
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            required
          />
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value.slice(0, 120))}
            placeholder={t("attachment_label_optional")}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number.parseInt(event.target.value || "0", 10) || 0)}
            className="h-10 w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            aria-label={t("sort_order")}
          />
          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? t("uploading") : t("upload_attachment")}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">{t("loading")}</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-500">{t("no_attachments_yet")}</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {attachment.label || attachment.file_name}
              </a>
              <span className="text-xs text-gray-500">{formatSize(attachment.size_bytes)}</span>
              <input
                type="number"
                value={attachment.sort_order}
                onChange={(event) => updateSort(attachment.id, Number.parseInt(event.target.value || "0", 10) || 0)}
                className="h-8 w-16 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-rose-500 hover:text-rose-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-rose-500 dark:hover:text-rose-400"
                aria-label={t("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

