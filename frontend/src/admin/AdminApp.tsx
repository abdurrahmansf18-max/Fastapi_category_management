"use client";

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../shared/components/LanguageSwitcher';
import { AlertTriangle, CheckCircle2, Edit3, Globe2, LogOut, Moon, Sun, X, Zap } from "lucide-react";

// frontend/src/admin/App.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminBottomNav, { type AdminMobileSection } from "./components/AdminBottomNav";
import AdminAppearanceSettings from "./components/AdminAppearanceSettings";
import AdminAnalyticsDashboard from "./components/AdminAnalyticsDashboard";
import AdminContentHealth from "./components/AdminContentHealth";
import AdminRealtimeNotifications from "./components/AdminRealtimeNotifications";
import AdminSearchInsights from "./components/AdminSearchInsights";
import AdminUsageBar from "./components/AdminUsageBar";
import { cx } from "./utils/uiHelpers";

import { useAdminAuth } from "../shared/hooks/useAdminAuth";
import { localizeBackendError } from "../shared/utils/localizeError";
import {
  AdminAuth,
  AdminUsersApi,
  CategoriesApi,
  HeadingsApi,
  ContentsApi,
  ContentImagesApi,
  ContentAttachmentsApi,
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
import CategoriesView from './views/CategoriesView';
import HeadingsView from './views/HeadingsView';
import ContentsView from './views/ContentsView';
import AdminUsersView from './views/AdminUsersView';
import RedirectsView from "./views/RedirectsView";
import NotificationsView from "./views/NotificationsView";

const mobileSectionIds: Record<AdminMobileSection, string> = {
  overview: "admin-overview",
  categories: "admin-categories",
  headings: "admin-headings",
  contents: "admin-contents",
  admins: "admin-users",
  redirects: "admin-redirects",
  notifications: "admin-notifications",
};

function sectionFromHash(hash: string): AdminMobileSection | null {
  const id = hash.replace(/^#/, "");
  const match = (Object.entries(mobileSectionIds) as Array<[AdminMobileSection, string]>)
    .find(([, sectionId]) => sectionId === id);
  return match?.[0] ?? null;
}

export default function App({ tenantSlug = "" }: { tenantSlug?: string }) {
  const { t } = useTranslation();
  const { siteTitle, siteLogo, primaryColor, reload: reloadSettings } = useSettings();
  const impersonationWarning = useMemo(() => {
    if (!tenantSlug) return null;
    return readCookie(`adm_impersonation_${tenantSlug.replace(/-/g, "_")}`);
  }, [tenantSlug]);

  // theme
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      return;
    }
    const cookieTheme = readCookie("theme");
    if (cookieTheme === "light" || cookieTheme === "dark") {
      setTheme(cookieTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  // auth
  const {
    token,
    logout,
    loading: authLoading,
    error: authError,
  } = useAdminAuth();

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
  const [activeMobileSection, setActiveMobileSection] =
    useState<AdminMobileSection>("overview");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      const section = sectionFromHash(window.location.hash);
      if (section) setActiveMobileSection(section);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const selectMobileSection = useCallback((section: AdminMobileSection) => {
    setActiveMobileSection(section);
    if (typeof window === "undefined") return;

    const id = mobileSectionIds[section];
    window.history.replaceState(null, "", `#${id}`);
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
  }, []);

  const sectionClass = useCallback(
    (section: AdminMobileSection) =>
      cx("scroll-mt-36", activeMobileSection === section ? "block" : "hidden md:block"),
    [activeMobileSection]
  );

  const refreshRealtimeData = useCallback(() => {
    CategoriesApi.list().then(setCats).catch(() => {});
    AdminUsageApi.get().then(setUsage).catch(() => {});
    if (activeCat?.id) {
      HeadingsApi.list({ level: 1, category_id: activeCat.id }).then(setH1s).catch(() => {});
    }
    if (activeH1?.id) {
      HeadingsApi.list({ level: 2, parent_heading_id: activeH1.id }).then(setH2s).catch(() => {});
    }
    if (currentHeadingId) {
      ContentsApi.list(currentHeadingId).then(setContents).catch(() => {});
    }
  }, [activeCat?.id, activeH1?.id, currentHeadingId]);

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
      .catch(() => {
        logout();
      });
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
  async function createCategory(name: string, description?: string, seoDescription?: string) {
    try {
      await CategoriesApi.create({
        name,
        description: toUndef(description),
        seo_description: toUndef(seoDescription),
      });
      await fetchCats();
      showNotification(t("category_added"), "success");
    } catch (err: any) {
      showNotification(localizeBackendError(err?.message, t), "error");
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
  async function createH1(catId: UUID, title: string, description?: string, seoDescription?: string) {
    await HeadingsApi.create({
      level: 1,
      category_id: catId,
      title,
      description: toUndef(description) || undefined,
      seo_description: toUndef(seoDescription) || undefined,
    });
    await fetchH1s(catId);
  }
  async function createH2(parentId: UUID, title: string, description?: string, seoDescription?: string) {
    await HeadingsApi.create({
      level: 2,
      parent_heading_id: parentId,
      title,
      description: toUndef(description) || undefined,
      seo_description: toUndef(seoDescription) || undefined,
    });
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
    attachments: Array<{ file: File; label?: string; sortOrder: number }>,
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
                showNotification(t("file_upload_failed"), "error");
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
              showNotification(t("image_save_failed"), "error");
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
      }

      if (attachments.length > 0) {
        for (const attachment of attachments) {
          try {
            await ContentAttachmentsApi.upload(
              attachment.file,
              newContent.id,
              attachment.label || attachment.file.name,
              attachment.sortOrder
            );
          } catch (uploadError) {
            console.error("[v0] Attachment upload error:", uploadError);
            showNotification(t("attachment_add_error"), "warning");
          }
        }
      }

      if (images.length === 0 && attachments.length === 0) {
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
      showNotification(t("admin_email_exists"), "error");
      return;
    }
    try {
      await AdminUsersApi.create(email, password);
      await fetchAdmins();
      showNotification(t("success"), "success");
    } catch (err: any) {
      showNotification(localizeBackendError(err?.message, t), "error");
    }
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
      <div className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:text-white">
          <h1 className="text-2xl font-bold">{t("central_login_title")}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("central_login_subtitle")}</p>
          {authError && (
            <p className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {authError}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={`/login?workspace=${encodeURIComponent(tenantSlug || "")}`}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              {authLoading ? t("loading") : t("login_to_continue")}
            </a>
            {tenantSlug && (
              <a
                href={`/d/${tenantSlug}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-emerald-500 hover:text-emerald-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              >
                {t("view_public_site")}
              </a>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-gray-100">
      {tenantSlug && (
        <AdminRealtimeNotifications tenantSlug={tenantSlug} onChange={refreshRealtimeData} />
      )}
      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`max-w-md w-full mx-4 p-5 rounded-2xl shadow-2xl border animate-[modalIn_.25s_ease-out] ${
              notification.type === "error"
                ? "bg-white dark:bg-gray-900 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-300"
                : notification.type === "warning"
                ? "bg-white dark:bg-gray-900 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "bg-white dark:bg-gray-900 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === "error" ? (
                <AlertTriangle className="h-5 w-5 shrink-0" />
              ) : notification.type === "warning" ? (
                <Zap className="h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              )}
              <p className="font-medium text-sm flex-1">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
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

      <header
        className={`sticky z-40 border-b border-gray-200 bg-white/95 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/95 ${
          impersonationWarning ? "top-10" : "top-0"
        }`}
      >
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:gap-4 sm:px-6">
          {/* Left: logo + title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex-shrink-0 h-9 w-9 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              {siteLogo ? (
                <img src={siteLogo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 32 32" className="w-5 h-5"><path d="M5 20c4-3 9-5 13-5l4 3c-5 0-8 1-12 4l-5-2zM13 9l4-2 8 5-5-1c-3-2-5-2-7-2z" fill="white" /></svg>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold leading-none text-gray-900 dark:text-white sm:text-base">{siteTitle}</h1>
              <p className="mt-0.5 hidden text-[11px] font-medium text-emerald-600 dark:text-emerald-400 sm:block">{t("admin_dashboard")}</p>
            </div>
            <button
              onClick={async () => {
                const newTitle = await showPrompt(t('site_title_prompt'), siteTitle);
                if (newTitle && newTitle !== siteTitle) {
                  try {
                    await AdminSettingsApi.updateSettings({ site_title: newTitle });
                    reloadSettings();
                    showNotification(t('site_title_success'), 'success');
                  } catch {
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
                    } catch {
                      showNotification(t('site_logo_error'), 'error');
                    }
                  };
                  input.click();
                }
              }}
              className="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white sm:flex"
              title={t('edit_site_title_logo')}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href={`/d/${tenantSlug}`}
              className="inline-flex h-8 w-8 sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 border border-emerald-200 dark:border-emerald-500/30 px-0 sm:px-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              <Globe2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('public_site')}</span>
            </a>
            <LanguageSwitcher compact />
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
              aria-label={theme === "dark" ? t("dark_mode") : t("light_mode")}
            >
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button
              onClick={logout}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-transparent text-[11px] font-semibold text-gray-600 transition-colors hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 sm:w-auto sm:px-3 sm:text-xs"
              aria-label={t("logout")}
            >
              <LogOut className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <AdminBottomNav
        activeSection={activeMobileSection}
        onSelect={selectMobileSection}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-8 sm:space-y-8 sm:px-6 sm:py-8">
        <section id="admin-overview" className={sectionClass("overview")}>
          <div className="space-y-4 sm:space-y-6">
            <AdminAppearanceSettings
              siteTitle={siteTitle}
              siteLogo={siteLogo}
              primaryColor={primaryColor}
              reloadSettings={reloadSettings}
              showNotification={showNotification}
            />

            <AdminUsageBar usage={usage} />

            <AdminAnalyticsDashboard />

            <AdminContentHealth />

            <AdminSearchInsights />
          </div>
        </section>

        <section id="admin-categories" className={sectionClass("categories")}>
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
        <section id="admin-headings" className={sectionClass("headings")}>
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
        <section id="admin-contents" className={sectionClass("contents")}>
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
        <section id="admin-users" className={sectionClass("admins")}>
          <AdminUsersView
            admins={admins}
            changeAdminPassword={changeAdminPassword}
            deleteAdmin={deleteAdmin}
            createAdmin={createAdmin}
            showNotification={showNotification}
          />
        </section>

        {/* REDIRECT RULES */}
        <section id="admin-redirects" className={sectionClass("redirects")}>
          <RedirectsView showNotification={showNotification} />
        </section>

        {/* NOTIFICATIONS (feedback) */}
        <div className={sectionClass("notifications")}>
          <NotificationsView tenantSlug={tenantSlug} />
        </div>
      </main>
    </div>
  );
}
