"use client";

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../shared/components/LanguageSwitcher';
import { AlertTriangle, CheckCircle2, Edit3, Globe2, Moon, Sun, X, Zap } from "lucide-react";

// frontend/src/admin/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import AdminBottomNav from "./components/AdminBottomNav";
import AdminBillingPanel from "./components/AdminBillingPanel";
import AdminContentHealth from "./components/AdminContentHealth";
import AdminSearchInsights from "./components/AdminSearchInsights";
import AdminUsageBar from "./components/AdminUsageBar";

import { useAdminAuth } from "../shared/hooks/useAdminAuth";
import {
  AdminAuth,
  AdminUsersApi,
  CategoriesApi,
  HeadingsApi,
  ContentsApi,
  ContentImagesApi,
  AdminUsageApi,
} from "../shared/api/admin";

import type {
  UUID,
  Category,
  Heading,
  Content,
  AdminUser,
} from "../shared/types/models";

import { AdminSettingsApi } from "../shared/api/admin";

interface TempImageData {
  url: string;
  alt: string;
  sortOrder: number;
  file?: File;
  width?: number;
  height?: number;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const toUndef = (s: string | null | undefined) => {

  const v = (s ?? "").trim();
  return v === "" ? null : v;
};

import { useSettings } from "../shared/context/SettingsContext";
import AdminLogin from './views/AdminLogin';
import CategoriesView from './views/CategoriesView';
import HeadingsView from './views/HeadingsView';
import ContentsView from './views/ContentsView';
import AdminUsersView from './views/AdminUsersView';

export default function App({ tenantSlug = "" }: { tenantSlug?: string }) {
  const { t } = useTranslation();
  const { siteTitle, siteLogo, reload: reloadSettings } = useSettings();
  const impersonationWarning = useMemo(() => {
    if (!tenantSlug) return null;
    return readCookie(`adm_impersonation_${tenantSlug.replace(/-/g, "_")}`);
  }, [tenantSlug]);

  // theme
  const [theme, setTheme] = useState<"light" | "dark">(
    (typeof window !== "undefined" ? (localStorage.getItem("theme") as any) : null) || "dark"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // auth
  const {
    token,
    login,
    logout,
    loading: authLoading,
    error: authError,
  } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // notification
  const [notification, setNotification] = useState<{
    message: string;
    type: "error" | "success" | "warning";
  } | null>(null);
  const showNotification = (
    m: string,
    t: "error" | "success" | "warning" = "error"
  ) => {
    setNotification({ message: m, type: t });
    setTimeout(() => setNotification(null), 4000);
  };

  // state
  const [cats, setCats] = useState<Category[]>([]);
  const [h1s, setH1s] = useState<Heading[]>([]);
  const [h2s, setH2s] = useState<Heading[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [activeCat, setActiveCat] = useState<Category | null>(null);
  const [activeH1, setActiveH1] = useState<Heading | null>(null);
  const [currentHeadingId, setCurrentHeadingId] = useState<UUID | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [contentImages, setContentImages] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [usage, setUsage] = useState<any>(null);

  // fetchers
  const fetchCats = () => CategoriesApi.list().then(setCats);
  const fetchH1s = (catId: UUID) =>
    HeadingsApi.list({ level: 1, category_id: catId }).then(setH1s);
  const fetchH2s = (h1Id: UUID) =>
    HeadingsApi.list({ level: 2, parent_heading_id: h1Id }).then(setH2s);
  const fetchContentsByHeading = (headingId: UUID) => {
    setCurrentHeadingId(headingId);
    return ContentsApi.list(headingId).then(setContents);
  };
  const fetchAdmins = () => AdminUsersApi.list().then(setAdmins);
  const fetchUsage = () => AdminUsageApi.get().then(setUsage);

  // L1 seçilince içerik önizleme
  useEffect(() => {
    if (!activeH1) return;
    if (h2s.length > 0) fetchContentsByHeading(h2s[0].id).catch(() => {});
    else fetchContentsByHeading(activeH1.id).catch(() => {});
  }, [activeH1, h2s.length]);

  useEffect(() => {
    setSelectedContent(null);
  }, [currentHeadingId]);

  // token varsa açılış sorguları
  useEffect(() => {
    if (!token) return;
    AdminAuth.me()
      .then(() => {
        fetchCats();
        fetchAdmins();
        fetchUsage().catch(() => {});
      })
      .catch(() => {});
  }, [token]);

  // -------- CRUD helpers --------
  // Category
  const [modal, setModal] = useState<{
    type: "prompt" | "confirm" | "alert";
    title: string;
    message?: string;
    defaultValue?: string;
    onConfirm: (value?: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const showPrompt = (
    title: string,
    defaultValue = "",
    message?: string
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setModal({
        type: "prompt",
        title,
        message,
        defaultValue,
        onConfirm: (value) => {
          setModal(null);
          resolve(value || null);
        },
        onCancel: () => {
          setModal(null);
          resolve(null);
        },
      });
    });
  };

  const showConfirm = (title: string, message?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        type: "confirm",
        title,
        message,
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          resolve(false);
        },
      });
    });
  };

  const showAlert = (title: string, message?: string): Promise<void> => {
    return new Promise((resolve) => {
      setModal({
        type: "alert",
        title,
        message,
        onConfirm: () => {
          setModal(null);
          resolve();
        },
      });
    });
  };
  async function createCategory(name: string, description?: string) {
    try {
      await CategoriesApi.create({ name, description: toUndef(description) });
      await fetchCats();
      showNotification(t("category_added"), "success");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || t("error");
      if (String(err?.response?.status) === "409") {
        showNotification(t("category_exists"), "error");
      } else {
        showNotification(`Kategori eklenemedi: ${msg}`, "error");
      }
      throw err;
    }
  }
  async function updateCategory(id: UUID, fields: any) {
    await CategoriesApi.update(id, {
      ...fields,
      description: toUndef(fields.description),
    });
    await fetchCats();
  }
  async function deleteCategory(id: UUID) {
    const confirmed = await showConfirm(t("delete_category"), t("delete_category_desc"));
    if (!confirmed) return;

    // Optimistic: ekranda anında düşür
    setCats((prev) => prev.filter((c) => c.id !== id));
    if (activeCat?.id === id) {
      setActiveCat(null);
      setH1s([]);
      setH2s([]);
      setContents([]);
      setCurrentHeadingId(null);
    }

    try {
      await CategoriesApi.remove(id);
    } finally {
      // Senkronizasyon (opsiyonel ama iyi olur)
      fetchCats().catch(() => {});
    }
  }

  // Heading
  async function createH1(catId: UUID, title: string) {
    await HeadingsApi.create({ level: 1, category_id: catId, title });
    await fetchH1s(catId);
  }
  async function createH2(parentId: UUID, title: string) {
    await HeadingsApi.create({ level: 2, parent_heading_id: parentId, title });
    await fetchH2s(parentId);
  }
  async function updateHeading(id: UUID, fields: any) {
    await HeadingsApi.update(id, {
      ...fields,
      description: toUndef(fields.description),
    });
    if (activeCat) await fetchH1s(activeCat.id);
    if (activeH1) await fetchH2s(activeH1.id);
  }
  // --- Heading
  async function deleteHeading(id: UUID) {
    const confirmed = await showConfirm(t("delete_title"), t("delete_title_desc"));
    if (!confirmed) return;

    const deletingActiveL1 = activeH1?.id === id;

    setH1s((prev) => prev.filter((h) => h.id !== id));

    if (deletingActiveL1) {
      // L1 silinince DB cascade ile tüm H2'ler ve içerikler de silinir
      setActiveH1(null);
      setH2s([]);
      setContents([]);
      setCurrentHeadingId(null);
    } else {
      setH2s((prev) => prev.filter((h) => h.id !== id));
      if (currentHeadingId === id) {
        setCurrentHeadingId(null);
        setContents([]);
      }
    }

    try {
      await HeadingsApi.remove(id);
    } finally {
      if (activeCat) fetchH1s(activeCat.id).catch(() => {});
    }
  }

  async function createContent(
    headingId: UUID,
    body: string,
    images: TempImageData[],
    description?: string,
    status: "draft" | "published" = "published"
  ) {
    try {
      const newContent = await ContentsApi.create({
        heading_id: headingId,
        body,
        description: toUndef(description),
        status,
      });

      if (images.length > 0) {
        const processedImages: Array<{
          url: string;
          alt: string;
          sortOrder: number;
        }> = [];

        // Process each image - upload files first, then create ContentImage records
        for (const image of images) {
          if (image.file) {
            // Upload file and get URL
            try {
              const uploadResult = await ContentImagesApi.upload(
                image.file,
                newContent.id, // Use actual content ID
                image.alt,
                image.sortOrder,
                image.width,
                image.height
              );
              processedImages.push({
                url: uploadResult.url,
                alt: image.alt,
                sortOrder: image.sortOrder,
              });
            } catch (uploadError) {
              console.error("[v0] File upload error:", uploadError);
              // Rollback content creation
              try {
                await ContentsApi.remove(newContent.id);
                showNotification(
                  `Dosya yükleme hatası: ${
                    uploadError instanceof Error
                      ? uploadError.message
                      : "Bilinmeyen hata"
                  }`,
                  "error"
                );
              } catch (rollbackError) {
                console.error("[v0] Rollback error:", rollbackError);
                showNotification(
                  t("content_added_but_image_failed"),
                  "warning"
                );
              }
              return;
            }
          } else if (image.url) {
            // Use URL-based image
            processedImages.push({
              url: image.url,
              alt: image.alt,
              sortOrder: image.sortOrder,
            });
          }
        }

        // Create ContentImage records for URL-based images (file uploads are already handled by upload endpoint)
        const urlBasedImages = processedImages.filter(
          (img) =>
            !images.find(
              (orig) => orig.file && orig.sortOrder === img.sortOrder
            )
        );

        if (urlBasedImages.length > 0) {
          const imagePromises = urlBasedImages.map((image) => {
            const originalImage = images.find(
              (img) => img.sortOrder === image.sortOrder
            );
            return ContentImagesApi.create({
              content_id: newContent.id,
              url: image.url,
              alt: image.alt,
              sort_order: image.sortOrder,
              width: originalImage?.width,
              height: originalImage?.height,
            });
          });

          try {
            await Promise.all(imagePromises);
          } catch (imageError) {
            console.error("[v0] Image creation error:", imageError);
            try {
              await ContentsApi.remove(newContent.id);
              showNotification(
                "Resim kaydetme hatası nedeniyle işlem iptal edildi!",
                "error"
              );
            } catch (rollbackError) {
              console.error("[v0] Rollback error:", rollbackError);
              showNotification(
                t("content_added_but_some_images_failed"),
                "warning"
              );
            }
            return;
          }
        }

        showNotification(
          t("content_images_added_success", { count: images.length }),
          "success"
        );
      } else {
        showNotification(t("content_added_success"), "success");
      }

      await fetchContentsByHeading(currentHeadingId ?? headingId);
    } catch (error) {
      console.error("[v0] Content creation error:", error);
      showNotification(t("error_adding_content"), "error");
    }
  }
  async function updateContent(id: UUID, fields: any) {
    const c = await ContentsApi.update(id, {
      ...fields,
      description: toUndef(fields.description),
    });
    await fetchContentsByHeading(currentHeadingId ?? c.heading_id);
  }
  async function deleteContent(id: UUID) {
    const confirmed = await showConfirm(t("delete_content"), t("delete_content_desc"));
    if (!confirmed) return;

    if (selectedContent?.id === id) {
      setSelectedContent(null);
    }

    // Optimistic
    setContents((prev) => prev.filter((c) => c.id !== id));

    try {
      await ContentsApi.remove(id);
    } finally {
      if (currentHeadingId)
        fetchContentsByHeading(currentHeadingId).catch(() => {});
    }
  }

  // Admin users
  async function createAdmin(email: string, password: string) {
    const exists = admins.some(
      (a) => a.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) {
      showNotification(
        "Bu e-posta adresi ile zaten bir admin mevcut!",
        "error"
      );
      return;
    }
    await AdminUsersApi.create(email, password);
    await fetchAdmins();
  }
  async function deleteAdmin(id: UUID) {
    const confirmed = await showConfirm(t("delete_admin"), t("delete_admin_desc"));
    if (!confirmed) return;

    // Optimistic
    setAdmins((prev) => prev.filter((a) => a.id !== id));

    try {
      await AdminUsersApi.remove(id);
    } finally {
      fetchAdmins().catch(() => {});
    }
  }
  async function changeAdminPassword(id: UUID) {
    const pw = await showPrompt(t("change_password"), "", t("new_password_colon"));
    if (!pw) return;
    await AdminUsersApi.changePw(id, pw);
    await showAlert(t("success"), t("password_updated"));
  }

  const hasMainHeadingContent = useMemo(
    () =>
      activeH1 ? contents.some((c) => c.heading_id === activeH1.id) : false,
    [activeH1, contents]
  );

  const hasCurrentHeadingContent = useMemo(
    () =>
      currentHeadingId
        ? contents.some((c) => c.heading_id === currentHeadingId)
        : false,
    [currentHeadingId, contents]
  );

  // LOGIN VIEW with enhanced styling
  if (!token) {
    return (
      <AdminLogin
        login={login}
        authLoading={authLoading}
        theme={theme}
        setTheme={setTheme}
        notification={notification}
        showNotification={showNotification}
        clearNotification={() => setNotification(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100/50 via-white to-gray-200/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800/20 pb-20 md:pb-0">
      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className={`max-w-md w-full mx-4 p-6 rounded-2xl shadow-2xl border animate-[modalIn_.25s_ease-out] ${
              notification.type === "error"
                ? "bg-red-50/95 dark:bg-red-950/95 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                : notification.type === "warning"
                ? "bg-amber-50/95 dark:bg-amber-950/95 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                : "bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
            }`}
            style={{
              boxShadow:
                notification.type === "error"
                  ? "0 20px 50px rgba(239,68,68,.35)"
                  : notification.type === "warning"
                  ? "0 20px 50px rgba(245,158,11,.35)"
                  : "0 20px 50px rgba(16,185,129,.30)",
            }}
          >
            <div className="flex items-center gap-4">
              {notification.type === "error" ? (
                <AlertTriangle className="h-6 w-6 shrink-0" />
              ) : notification.type === "warning" ? (
                <Zap className="h-6 w-6 shrink-0" />
              ) : (
                <CheckCircle2 className="h-6 w-6 shrink-0" />
              )}
              <p className="font-medium text-base flex-1">
                {notification.message}
              </p>
              <button
                onClick={() => setNotification(null)}
                className="ml-2 text-xl hover:opacity-70 transition-opacity"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className={`${
              modal.type === "prompt" && modal.title === t("edit_content")
                ? "max-w-4xl w-full mx-4 h-[80vh]"
                : "max-w-md w-full mx-4"
            } p-6 rounded-2xl shadow-2xl border bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-800 animate-[modalIn_.25s_ease-out] ${
              modal.type === "prompt" && modal.title === t("edit_content")
                ? "flex flex-col"
                : ""
            }`}
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {modal.title}
              </h3>
              {modal.message && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {modal.message}
                </p>
              )}
            </div>

            {modal.type === "prompt" && (
              <>
                {modal.title === t("edit_content") ? (
                  <textarea
                    defaultValue={modal.defaultValue}
                    className="w-full flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-4 resize-none font-mono text-sm"
                    placeholder={t("content_placeholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        modal.onCancel?.();
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <input
                    type="text"
                    defaultValue={modal.defaultValue}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-4"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        modal.onConfirm((e.target as HTMLInputElement).value);
                      } else if (e.key === "Escape") {
                        modal.onCancel?.();
                      }
                    }}
                    autoFocus
                  />
                )}
              </>
            )}

            <div className="flex gap-3 justify-end">
              {modal.type !== "alert" && (
                <button
                  onClick={modal.onCancel}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >{t("cancel")}</button>
              )}
              <button
                onClick={() => {
                  if (modal.type === "prompt") {
                    const input = document.querySelector(
                      'input[type="text"]'
                    ) as HTMLInputElement;
                    const textarea = document.querySelector(
                      "textarea"
                    ) as HTMLTextAreaElement;
                    modal.onConfirm(input?.value || textarea?.value);
                  } else {
                    modal.onConfirm();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
              >
                {modal.type === "alert" ? t("ok") : t("confirm_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {impersonationWarning && (
        <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          {t("impersonation_warning", {
            defaultValue: "Platform owner impersonation is active: {{reason}}",
            reason: impersonationWarning,
          })}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-xl border-b border-emerald-600/30">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-600/70 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-xl bg-emerald-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-800 ring-2 ring-emerald-600/40 shadow-xl group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 overflow-hidden">
                {siteLogo ? (
                  <img src={siteLogo} alt="Site Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 48 48" className="w-8 h-8">
                    <path
                      d="M8 30c6-5 13-8 20-8l6 4c-7 0-12 2-18 7l-8-3zM20 14l6-3 12 8-7-1c-4-3-7-4-11-4z"
                      fill="white"
                    />
                  </svg>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
                  {siteTitle}
                </h1>
                <p className="text-xs text-emerald-300 -mt-0.5 font-medium">
                  {t("admin_dashboard")}
                </p>
              </div>
              <button
                onClick={async () => {
                  const newTitle = await showPrompt(t('site_title_prompt'), siteTitle);
                  if (newTitle && newTitle !== siteTitle) {
                    try {
                      await AdminSettingsApi.updateSettings({ site_title: newTitle });
                      reloadSettings();
                      showNotification(t('site_title_success'), 'success');
                    } catch (e) {
                      showNotification(t('site_title_error'), 'error');
                    }
                  }
                  
                  const uploadLogo = await showPrompt(t('upload_logo_prompt'), 'yes', t('upload_logo_desc'));
                  if (uploadLogo?.toLowerCase() === 'yes') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = async (e: any) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        await AdminSettingsApi.uploadSiteLogo(formData);
                        reloadSettings();
                        showNotification(t('site_logo_success'), 'success');
                      } catch (err) {
                        showNotification(t('site_logo_error'), 'error');
                      }
                    };
                    input.click();
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 hover:text-white transition-colors"
                title={t('edit_site_title_logo')}
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 md:w-auto md:gap-4">
            <a
              href={`/d/${tenantSlug}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-sm font-bold text-white md:flex-none sm:px-6
                         ring-2 ring-emerald-500/60 hover:ring-emerald-400
                         bg-emerald-600/30 hover:bg-emerald-600/40
                         shadow-lg hover:shadow-emerald-600/40
                         hover:scale-105 transition-all duration-300"
            >
              <Globe2 className="h-4 w-4" />
              {t('public_site')}
            </a>

            <LanguageSwitcher />
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="min-h-11 px-4 sm:px-6 py-3 rounded-2xl text-sm font-bold text-white
                         bg-gradient-to-r from-emerald-700 to-emerald-600
                         shadow-lg hover:shadow-xl hover:shadow-emerald-600/50
                         hover:scale-105 transition-all duration-300"
              aria-label={theme === "dark" ? t("dark_mode") : t("light_mode")}
            >
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <button
              onClick={logout}
              className="min-h-11 px-4 sm:px-6 py-3 rounded-2xl text-sm font-bold text-white
                         ring-2 ring-white/20 hover:ring-rose-400/60 
                         bg-white/10 hover:bg-rose-500/20
                         hover:text-rose-200 hover:scale-105 transition-all duration-300"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
        <AdminUsageBar usage={usage} />

        <AdminBillingPanel usage={usage} />

        <AdminContentHealth />

        <AdminSearchInsights />

        <section id="admin-categories" className="scroll-mt-32">
          <CategoriesView
            cats={cats}
            activeCat={activeCat}
            setActiveCat={setActiveCat}
            setActiveH1={setActiveH1}
            setH2s={setH2s}
            setContents={setContents}
            setCurrentHeadingId={setCurrentHeadingId}
            fetchH1s={fetchH1s}
            showPrompt={showPrompt}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            createCategory={createCategory}
          />
        </section>

        {/* HEADINGS */}
        <section id="admin-headings" className="scroll-mt-32">
          <HeadingsView
            activeCat={activeCat}
            activeH1={activeH1}
            setActiveH1={setActiveH1}
            h1s={h1s}
            h2s={h2s}
            setH2s={setH2s}
            setContents={setContents}
            contents={contents}
            setCurrentHeadingId={setCurrentHeadingId}
            fetchH2s={fetchH2s}
            fetchContentsByHeading={fetchContentsByHeading}
            showPrompt={showPrompt}
            updateHeading={updateHeading}
            deleteHeading={deleteHeading}
            createH1={createH1}
            createH2={createH2}
          />
        </section>

        {/* CONTENTS */}
        <section id="admin-contents" className="scroll-mt-32">
          <ContentsView
            currentHeadingId={currentHeadingId}
            selectedContent={selectedContent}
            setSelectedContent={setSelectedContent}
            showNotification={showNotification}
            contents={contents}
            activeH1={activeH1}
            h1s={h1s}
            h2s={h2s}
            fetchContentsByHeading={fetchContentsByHeading}
            showPrompt={showPrompt}
            showConfirm={showConfirm}
            createContent={createContent}
          />
        </section>

        {/* ADMIN USERS */}
        <section id="admin-users" className="scroll-mt-32">
          <AdminUsersView
            admins={admins}
            changeAdminPassword={changeAdminPassword}
            deleteAdmin={deleteAdmin}
            createAdmin={createAdmin}
            showNotification={showNotification}
          />
        </section>
      </main>

      <AdminBottomNav />
    </div>
  );
}
