import { useEffect, useState } from "react";
import { ImagePlus, Palette, Save, Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminSettingsApi } from "../../shared/api/admin";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export default function AdminAppearanceSettings({
  siteTitle,
  siteLogo,
  primaryColor,
  reloadSettings,
  showNotification,
}: {
  siteTitle: string;
  siteLogo: string;
  primaryColor: string;
  reloadSettings: () => Promise<void>;
  showNotification: (message: string, type?: "error" | "success" | "warning") => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(siteTitle);
  const [color, setColor] = useState(primaryColor || "#10b981");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setTitle(siteTitle);
  }, [siteTitle]);

  useEffect(() => {
    setColor(primaryColor || "#10b981");
  }, [primaryColor]);

  async function saveAppearance() {
    const nextColor = color.trim().toLowerCase();
    const nextTitle = title.trim();
    if (!HEX_COLOR_RE.test(nextColor)) {
      showNotification(t("theme_color_invalid"), "error");
      return;
    }

    setSaving(true);
    try {
      await AdminSettingsApi.updateSettings({
        site_title: nextTitle || siteTitle,
        primary_color: nextColor,
      });
      await reloadSettings();
      showNotification(t("appearance_settings_success"), "success");
    } catch {
      showNotification(t("appearance_settings_error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await AdminSettingsApi.uploadSiteLogo(formData);
      await reloadSettings();
      showNotification(t("site_logo_success"), "success");
    } catch {
      showNotification(t("site_logo_error"), "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="section-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/20 text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            {siteLogo ? (
              <img src={siteLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              siteTitle.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {t("appearance_settings")}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("appearance_settings_desc")}</p>
          </div>
        </div>

        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-xs font-semibold text-gray-700 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-emerald-600 dark:hover:text-emerald-300">
          <ImagePlus className="h-4 w-4" />
          {uploading ? t("uploading") : t("upload_logo")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => uploadLogo(event.target.files?.[0])}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            <Type className="h-3.5 w-3.5" />
            {t("site_title_prompt")}
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            <Palette className="h-3.5 w-3.5" />
            {t("theme_color")}
          </span>
          <div className="flex min-h-11 overflow-hidden rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
            <input
              type="color"
              value={HEX_COLOR_RE.test(color) ? color : "#10b981"}
              onChange={(event) => setColor(event.target.value)}
              className="h-11 w-14 shrink-0 cursor-pointer border-0 bg-transparent p-1"
              aria-label={t("theme_color")}
            />
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-gray-900 outline-none dark:text-white"
              placeholder="#10b981"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{t("theme_color_hint")}</p>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={saveAppearance}
          disabled={saving}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Save className="h-4 w-4" />
          {saving ? t("saving") : t("save_appearance")}
        </button>
      </div>
    </section>
  );
}
