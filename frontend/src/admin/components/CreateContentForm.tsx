"use client";

import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UUID } from "../../shared/types/models";
import { ContentImagesApi, AI } from "../../shared/api/admin";

import type { ImagePlaceholder, ImageData } from "./create-content/types";
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
    description?: string
  ) => void;
}) {
  const { t, i18n } = useTranslation();
  const [body, setBody] = useState<string>(() => t("default_markdown_content"));
  const prevLang = useRef(i18n.language);

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
  const [isAiFormatting, setIsAiFormatting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    body?: string;
    target?: string;
  }>({});

  useEffect(() => {
    if (targetOptions[0]) setTarget(targetOptions[0].id);
  }, [targetOptions]);

  useEffect(() => {
    const regex = /<--image-->/g;
    const matches = [];
    let match;
    let index = 0;

    while ((match = regex.exec(body)) !== null) {
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

    // Sadece placeholder sayısı değiştiyse state'i güncelle
    if (matches.length !== imagePlaceholders.length) {
      setImagePlaceholders(matches);
    }
  }, [body]);

  useEffect(() => {
    const errors: { body?: string; target?: string } = {};

    if (!body.trim()) {
      errors.body = "İçerik boş olamaz";
    } else if (body.trim().length < 10) {
      errors.body = "İçerik en az 10 karakter olmalı";
    }

    if (!target) {
      errors.target = "Bir başlık seçmelisiniz";
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
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
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


  const autoFormatMarkdown = async () => {
    if (!body.trim()) return;
    setIsAiFormatting(true);
    try {
      const response = await AI.formatMarkdown(body);
      setBody(response.markdown);
    } catch (error) {
      console.error("AI Error:", error);
      alert("Yapay zeka formatter hatası. Lütfen konsolu kontrol edin.");
    } finally {
      setIsAiFormatting(false);
    }
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
        alert("Lütfen sadece resim dosyası seçin");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Dosya boyutu 5MB'dan küçük olmalı");
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

  const uploadFile = async (file: File): Promise<string> => {
    try {
      const result = await ContentImagesApi.upload(
        file,
        window.crypto.randomUUID(), // Generate a proper UUID for content_id
        "", // alt text (will be set later)
        0 // sort_order
      );
      return result.url;
    } catch (error) {
      console.error("[v0] Upload failed:", error);
      throw new Error(
        `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

      await onCreate(target as UUID, body, processedImages);
      setBody(`# Yeni İçerik

Bu bir **Markdown** içeriktir.

- Madde 1
- Madde 2
`);
      setImagePlaceholders([]);
      setShowPreview(false);
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

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400">📑</span>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">📝</span>
              {t("content_markdown")}
            </label>
            <div className="flex items-center gap-2">
              {!showPreview && (
                <button
                  type="button"
                  onClick={autoFormatMarkdown}
                  disabled={isAiFormatting}
                  className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors font-medium disabled:opacity-50"
                >
                  {isAiFormatting ? "⏳ " + t("ai_formatting") : "🪄 " + t("convert_to_markdown")}
                </button>
              )}
              <button
                type="button"
                onClick={insertImagePlaceholder}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
              >
                🖼️ {t("add_image")}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-900/50 transition-colors font-medium"
              >
                {showPreview ? `📝 ${t("edit")}` : `👁️ ${t("preview")}`}
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
                <span className="text-base">👁️</span> {t("preview_note")}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {body.replace(/<--image-->/g, `\n\n> 🖼️ **[ ${t("image")} ]**\n\n`)}
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

        <UsageTips />

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
              <span>✨</span>
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
