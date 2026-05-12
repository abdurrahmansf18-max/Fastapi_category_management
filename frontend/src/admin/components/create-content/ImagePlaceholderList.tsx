import type React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Camera, CheckCircle2, FolderOpen, ImageIcon, Trash2 } from "lucide-react";
import type { ImagePlaceholder } from "./types";
import ResizableImagePreview from "./ResizableImagePreview";

interface ImagePlaceholderListProps {
  imagePlaceholders: ImagePlaceholder[];
  imagePreviewErrors: { [key: number]: boolean };
  removeImagePlaceholder: (index: number) => void;
  updateImagePlaceholder: (index: number, field: "url" | "alt" | "width" | "height", value: string | number) => void;
  handleFileSelect: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageSizeChange: (index: number, width: number, height: number) => void;
  handleImageError: (index: number) => void;
  handleImageLoad: (index: number) => void;
}

export default function ImagePlaceholderList({
  imagePlaceholders,
  imagePreviewErrors,
  removeImagePlaceholder,
  updateImagePlaceholder,
  handleFileSelect,
  handleImageSizeChange,
  handleImageError,
  handleImageLoad,
}: ImagePlaceholderListProps) {
  const { t } = useTranslation();
  return (
    <>
      {imagePlaceholders.length > 0 && (
          <div className="space-y-4 mt-6 p-4 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/30 dark:border-blue-800/30">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t("image_info")}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-100/50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                {
                  imagePlaceholders.filter((img) => img.url && img.isValid)
                    .length
                }{" "}
                / {imagePlaceholders.length} {t("ready")}
              </div>
            </div>

            <div className="space-y-3">
              {imagePlaceholders.map((img, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/70 dark:bg-gray-800/50 border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {t("image_number")} {idx + 1}
                      </span>
                      {img.isValid && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="mr-1 inline h-3 w-3" />
                          {t("valid")}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImagePlaceholder(idx)}
                      className="text-red-500 hover:text-red-700 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                    >
                      <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                      {t("delete")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-3">
                      <div className="relative">
                        <input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={img.url}
                          onChange={(e) =>
                            updateImagePlaceholder(idx, "url", e.target.value)
                          }
                          disabled={!!img.file}
                          className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 ${
                            img.file
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                              : img.url && !img.isValid
                              ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20"
                              : img.isValid
                              ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20"
                              : "border-blue-300/60 dark:border-blue-700/60 bg-white/90 dark:bg-gray-800/80"
                          }`}
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t("or")}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(idx, e)}
                            className="hidden"
                            id={`file-${idx}`}
                          />
                          <label
                            htmlFor={`file-${idx}`}
                            className="px-3 py-1.5 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer font-medium"
                          >
                            <FolderOpen className="mr-1 inline h-3.5 w-3.5" />
                            {t("select_from_computer")}
                          </label>
                          {img.file && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {img.file.name}
                            </span>
                          )}
                        </div>
                        {img.url && !img.isValid && !img.file && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {t("valid_image_url_required")}
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={t("image_alt_placeholder")}
                        value={img.alt}
                        onChange={(e) =>
                          updateImagePlaceholder(idx, "alt", e.target.value)
                        }
                        className="w-full rounded-lg border border-blue-300/60 dark:border-blue-700/60 bg-white/90 dark:bg-gray-800/80 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      {((img.url && img.isValid) || img.file) && (
                        <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex justify-center">
                          {img.isUploading ? (
                            <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 aspect-video">
                              <div className="text-center">
                                <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                                <div className="text-xs">{t("loading")}</div>
                              </div>
                            </div>
                          ) : !imagePreviewErrors[idx] ? (
                            <ResizableImagePreview
                              image={img}
                              onSizeChange={(width, height) =>
                                handleImageSizeChange(idx, width, height)
                              }
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs aspect-video">
                              <div className="text-center">
                                <AlertTriangle className="mx-auto mb-1 h-6 w-6" />
                                <div>{t('image_could_not_be_loaded')}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {(!img.url || !img.isValid) && !img.file && (
                        <div className="aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <div className="text-center text-gray-400 dark:text-gray-600 text-xs">
                            <Camera className="mx-auto mb-1 h-6 w-6" />
                            <div>{t("preview")}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  );
}
