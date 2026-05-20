"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertTriangle, Edit3, Eye, FileText, Heading3, ImagePlus, Info, Sparkles } from "lucide-react";
import type { UUID } from "../../shared/types/models";

import type { ImagePlaceholder, ImageData, AttachmentData } from "./create-content/types";
import ResizableImagePreview from "./create-content/ResizableImagePreview";
import UsageTips from "./create-content/UsageTips";
import ImagePlaceholderList from "./create-content/ImagePlaceholderList";

export default function CreateContentForm({
  targetOptions,
  onCreate,
}: {
  targetOptions: { id: UUID; label: string }[];
  onCreate: (
    headingId: UUID,
    body: string,
    images: ImageData[],
    attachments: AttachmentData[],
    description?: string,
    status?: "draft" | "published"
  ) => void;
}) {
  const { t, i18n } = useTranslation();
  const [body, setBody] = useState<string>(() => t("default_markdown_content"));
  const [description, setDescription] = useState("");
  const BODY_MIN = 120;
  const dynamicDescMax = Math.min(320, Math.max(80, Math.floor(body.trim().length * 0.2)));
  const prevLang = useRef(i18n.language);

  useEffect(() => {
    setDescription((prev) => (prev.length > dynamicDescMax ? prev.slice(0, dynamicDescMax) : prev));
  }, [dynamicDescMax]);

  useEffect(() => {
    if (prevLang.current !== i18n.language) {
      const oldTr = t("default_markdown_content", { lng: "tr" });
      const oldEn = t("default_markdown_content", { lng: "en" });
      const oldAr = t("default_markdown_content", { lng: "ar" });

      if (body === oldTr || body === oldEn || body === oldAr || body === "") {
        setBody(t("default_markdown_content"));
      }
      prevLang.current = i18n.language;
    }
  }, [i18n.language, body, t]);

  const [target, setTarget] = useState<UUID | "">("");
  const [imagePlaceholders, setImagePlaceholders] = useState<
    ImagePlaceholder[]
  >([]);
  const [imagePreviewErrors, setImagePreviewErrors] = useState<{
    [key: number]: boolean;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    body?: string;
    target?: string;
  }>({});
  const [formNotice, setFormNotice] = useState<string>("");

  useEffect(() => {
    if (targetOptions[0]) setTarget(targetOptions[0].id);
  }, [targetOptions]);

  useEffect(() => {
    if (!target || typeof window === "undefined") return;
    const saved = localStorage.getItem(`content_draft:${target}`);
    if (saved) setBody(saved);
  }, [target]);

  useEffect(() => {
    if (!target || typeof window === "undefined") return;
    const handle = window.setTimeout(() => {
      localStorage.setItem(`content_draft:${target}`, body);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [body, target]);

  useEffect(() => {
    const regex = /<--image-->/g;
    const matches = [];
    let index = 0;

    while (regex.exec(body) !== null) {
      const existingImg = imagePlaceholders[index];
      matches.push({
        index,
        url: existingImg?.url || "",
        alt: existingImg?.alt || "",
        sortOrder: index,
        isValid: existingImg?.isValid || false,
        width: existingImg?.width || 300,
        height: existingImg?.height || 200,
      });
      index++;
    }

    // Keep existing image settings when only placeholder text changes.
    if (matches.length !== imagePlaceholders.length) {
      setImagePlaceholders(matches);
    }
  }, [body]);

  useEffect(() => {
    const errors: { body?: string; target?: string } = {};

    if (!body.trim()) {
      errors.body = t("content_required");
    } else if (body.trim().length < BODY_MIN) {
      errors.body = t("content_min_length");
    }

    if (!target) {
      errors.target = t("heading_required");
    }

    setFormErrors(errors);
  }, [body, target]);

  const updateImagePlaceholder = (
    index: number,
    field: "url" | "alt" | "width" | "height",
    value: string | number
  ) => {
    setImagePlaceholders((prev) =>
      prev.map((img) => {
        if (img.index === index) {
          const updated = { ...img, [field]: value };
          // URL validation
          if (field === "url") {
            updated.isValid = isValidImageUrl(value as string);
          }
          return updated;
        }
        return img;
      })
    );
  };

  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  };

  const handleImageError = (index: number) => {
    setImagePreviewErrors((prev) => ({ ...prev, [index]: true }));
  };

  const handleImageLoad = (index: number) => {
    setImagePreviewErrors((prev) => ({ ...prev, [index]: false }));
  };

  const removeImagePlaceholder = (index: number) => {
    const regex = /<--image-->/g;
    let match;
    let currentIndex = 0;
    let newBody = body;

    while ((match = regex.exec(body)) !== null) {
      if (currentIndex === index) {
        newBody =
          body.substring(0, match.index) +
          body.substring(match.index + match[0].length);
        break;
      }
      currentIndex++;
    }

    setBody(newBody);
  };

  const insertImagePlaceholder = () => {
    const cursorPos =
      (document.activeElement as HTMLTextAreaElement)?.selectionStart ||
      body.length;
    const newBody =
      body.slice(0, cursorPos) + "<--image-->" + body.slice(cursorPos);
    setBody(newBody);
  };

  const handleFileSelect = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setFormNotice(t("select_only_image"));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormNotice(t("file_size_max_5mb"));
        return;
      }

      setImagePlaceholders((prev) =>
        prev.map((img) =>
          img.index === index
            ? { ...img, file, url: "", isValid: true, isUploading: false }
            : img
        )
      );
    }
  };

  const handleAttachmentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const next: AttachmentData[] = [];
    for (const file of Array.from(files)) {
      next.push({
        file,
        label: file.name,
        sortOrder: attachments.length + next.length,
      });
    }
    setAttachments((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const updateAttachmentLabel = (index: number, value: string) => {
    setAttachments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, label: value.slice(0, 120) } : item))
    );
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    if (!body.trim() || !target) return;

    setIsSubmitting(true);

    try {
      const processedImages: ImageData[] = [];

      for (const img of imagePlaceholders) {
        if (img.file) {
          // Store file data for later upload after content creation
          processedImages.push({
            url: "", // Will be set after upload
            alt: img.alt || "",
            sortOrder: img.sortOrder,
            file: img.file, // Pass file to onCreate
            width: img.width || 300,
            height: img.height || 200,
          });
        } else if (img.url && img.isValid) {
          // Use URL-based image
          processedImages.push({
            url: img.url,
            alt: img.alt || "",
            sortOrder: img.sortOrder,
            width: img.width || 300,
            height: img.height || 200,
          });
        }
      }

      await onCreate(
        target as UUID,
        body,
        processedImages,
        attachments,
        description.trim() || undefined,
        isDraft ? "draft" : "published"
      );
      if (typeof window !== "undefined") {
        localStorage.removeItem(`content_draft:${target}`);
      }
      setBody(t("default_markdown_content"));
      setDescription("");
      setImagePlaceholders([]);
      setAttachments([]);
      setShowPreview(false);
      setFormNotice("");
    } catch (error) {
      console.error("[v0] Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidationErrors = Object.keys(formErrors).length > 0;
  const hasInvalidImages = imagePlaceholders.some(
    (img) => img.url && !img.isValid
  );
  const isFormValid = !hasValidationErrors && !hasInvalidImages;

  const handleImageSizeChange = (
    index: number,
    width: number,
    height: number
  ) => {
    setImagePlaceholders((prev) =>
      prev.map((img) => (img.index === index ? { ...img, width, height } : img))
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300/60 dark:border-gray-700/60 backdrop-blur-sm shadow-lg"
    >
      <div className="font-semibold mb-6 text-lg text-gray-700 dark:text-gray-300 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white text-sm">
          +
        </div>
        <div>
          <h3>{t("add_new_content")}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
            {t("add_content_desc")}
          </p>
        </div>
      </div>

      {formNotice && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{formNotice}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Heading3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("target_heading")}
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as UUID)}
            className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 dark:text-white ${
              formErrors.target
                ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20"
                : "border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80"
            }`}
          >
            <option value="">{t("select_heading")}...</option>
            {targetOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {formErrors.target && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {formErrors.target}
            </p>
          )}
        </div>

        {/* SEO Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("content_description_label")}
            <span className="text-xs font-normal text-gray-400">({t("optional")})</span>
          </label>

          {/* SEO guidance box */}
          <div className="rounded-xl border border-sky-200/70 bg-sky-50/60 px-4 py-3 dark:border-sky-700/30 dark:bg-sky-900/15">
            <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 mb-1">{t("seo_guide_title")}</p>
            <ul className="text-xs text-sky-600 dark:text-sky-400 space-y-0.5 list-disc list-inside">
              <li>{t("seo_guide_1")}</li>
              <li>{t("seo_guide_2")}</li>
              <li>{t("seo_guide_3")}</li>
            </ul>
          </div>

          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, dynamicDescMax))}
              rows={2}
              placeholder={t("content_description_placeholder")}
              className="w-full rounded-xl border border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none pr-16"
            />
            <span className={`absolute bottom-2.5 right-3 text-xs font-mono tabular-nums ${
              description.length >= dynamicDescMax
                ? "text-red-500"
                : description.length >= 120
                ? "text-amber-500"
                : description.length >= 70
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-400"
            }`}>
              {description.length}/{dynamicDescMax}
            </span>
          </div>

          {description.length > 0 && description.length < 70 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{t("seo_desc_too_short")}</p>
          )}
          {description.length >= 120 && description.length < dynamicDescMax && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{t("seo_desc_ideal")}</p>
          )}
          {description.length >= dynamicDescMax && (
            <p className="text-xs text-red-500">{t("seo_desc_too_long")}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("content_markdown")}
            </label>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={insertImagePlaceholder}
                className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 sm:w-auto"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {t("add_image")}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:bg-gray-900/50 sm:w-auto"
              >
                {showPreview ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreview ? t("edit") : t("preview")}
              </button>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-2 rounded-lg text-xs leading-relaxed">
            {t("markdown_hint")}
          </div>

          {!showPreview ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder={t("content_placeholder")}
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono resize-none ${
                formErrors.body
                  ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20"
                  : "border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80"
              }`}
            />
          ) : (
            <div className="w-full min-h-[240px] rounded-xl border border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80 p-6 flex flex-col">
              <div className="mb-4 pb-3 border-b border-gray-200/60 dark:border-gray-700/50 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 opacity-90">
                <Eye className="h-4 w-4" /> {t("preview_note")}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {body.replace(/<--image-->/g, `\n\n> **[ ${t("image")} ]**\n\n`)}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {formErrors.body && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {formErrors.body}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{body.length} {t("characters")}</span>
            <span>{imagePlaceholders.length} {t("image_placeholders_count")}</span>
          </div>
        </div>

        <ImagePlaceholderList
          imagePlaceholders={imagePlaceholders}
          imagePreviewErrors={imagePreviewErrors}
          removeImagePlaceholder={removeImagePlaceholder}
          updateImagePlaceholder={updateImagePlaceholder}
          handleFileSelect={handleFileSelect}
          handleImageSizeChange={handleImageSizeChange}
          handleImageError={handleImageError}
          handleImageLoad={handleImageLoad}
        />

        <div className="space-y-2 rounded-xl border border-gray-200/60 bg-white/70 p-4 dark:border-gray-700/60 dark:bg-gray-800/60">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("attachments")}</label>
          <input
            type="file"
            multiple
            onChange={handleAttachmentFileSelect}
            className="w-full rounded-lg border border-gray-300/60 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700/60 dark:bg-gray-900 dark:text-gray-200"
          />
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((item, index) => (
                <div key={`${item.file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900">
                  <p className="min-w-0 flex-1 truncate text-xs text-gray-500">{item.file.name}</p>
                  <input
                    value={item.label || ""}
                    onChange={(e) => updateAttachmentLabel(index, e.target.value)}
                    className="h-8 w-44 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    placeholder={t("attachment_label_optional")}
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="h-8 rounded-md border border-gray-300 px-2 text-xs text-gray-600 hover:border-rose-500 hover:text-rose-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-rose-500 dark:hover:text-rose-400"
                  >
                    {t("delete")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <UsageTips />

        <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
          <span>{isDraft ? t("status_draft") : t("status_published")}</span>
          <input
            type="checkbox"
            checked={isDraft}
            onChange={(event) => setIsDraft(event.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
          />
        </label>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`w-full px-6 py-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 transform ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : !isFormValid
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{t("adding_content")}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{t("add_content")}</span>
              {imagePlaceholders.length > 0 && (
                <span className="text-xs opacity-80">
                  (
                  {
                    imagePlaceholders.filter((img) => img.url && img.isValid)
                      .length
                  }{" "}
                  {t("with_images")})
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    </form>
  );
}
