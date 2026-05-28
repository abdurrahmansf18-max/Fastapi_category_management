"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye, EyeOff, Globe, LogOut, RefreshCw,
  Settings, Shield, Search, ChevronDown, Clock, ImageIcon, Upload, X, Trash2,
  Copy, Check, Home, AlertTriangle, User, Key, Activity, Archive,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */
type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  owner_email: string;
};

type AuditItem = {
  id: string;
  tenant_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

type Lang = "tr" | "en" | "ar";
type Tab = "tenants" | "audit" | "branding" | "messages";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  archived: boolean;
  created_at: string;
};

/* ─── Translations ────────────────────────────────────────────────── */
const COPY: Record<Lang, Record<string, string>> = {
  tr: {
    loginTitle: "Platform Sahibi Girişi",
    loginDesc: "2FA korumalı yönetim konsolu.",
    email: "E-posta",
    password: "Şifre",
    totp: "TOTP kodu (6 hane)",
    login: "Giriş Yap",
    logging: "Giriş yapılıyor…",
    owner: "Owner Panel",
    title: "Platform Yönetim Konsolu",
    refresh: "Yenile",
    public: "Public",
    admin: "Admin",
    impersonate: "Impersonate",
    impersonateReason: "Neden bu hesaba giriş yapıyorsunuz? (min. 5 karakter)",
    impersonateCancel: "İptal",
    impersonateConfirm: "Onayla",
    activeTenants: "Aktif",
    totalTenants: "Toplam Tenant",
    queue: "Kuyruk",
    backup: "Yedek",
    restore: "Geri Yükleme",
    observability: "İzleme",
    search: "Arama",
    redis: "Redis",
    configured: "✓ aktif",
    notConfigured: "eksik",
    logout: "Çıkış Yap",
    noTenants: "Henüz kayıtlı workspace yok.",
    loginFailed: "Giriş başarısız.",
    statusError: "Durum güncellenemedi.",
    loadError: "Veriler yüklenemedi.",
    tabTenants: "Tenantlar",
    tabAudit: "Audit Log",
    filterPlaceholder: "İsim veya slug ara…",
    createdAt: "Kayıt",
    suspend: "Askıya Al",
    activate: "Aktifleştir",
    pending: "Beklemede",
    auditLoadMore: "Daha Fazla Yükle",
    auditLoading: "Yükleniyor…",
    auditEmpty: "Kayıt bulunamadı.",
    auditFilter: "Eylem filtrele…",
    tabBranding: "Marka",
    brandingTitle: "Site Adı ve Logosu",
    brandingDesc: "Ana sayfada görünen site adı ve logoyu buradan değiştirebilirsin.",
    brandingSiteName: "Site Adı",
    brandingLogoLabel: "Logo (URL veya dosya yükle)",
    brandingLogoPlaceholder: "https://... veya boş bırak",
    brandingUpload: "Dosya Seç",
    brandingClearLogo: "Logoyu Temizle",
    brandingSave: "Kaydet",
    brandingSaving: "Kaydediliyor…",
    brandingSaved: "Kaydedildi!",
    brandingPreview: "Önizleme",
    brandingLoadError: "Marka ayarları yüklenemedi.",
    brandingSaveError: "Kaydedilemedi.",
    delete: "Sil",
    deleteConfirm: "Workspace'i Sil",
    deleteWarning: "Bu işlem geri alınamaz. Tüm veriler, şema ve kullanıcı hesabı kalıcı olarak silinecek.",
    deleteSlugPrompt: "Onaylamak için workspace slug'ını yazın:",
    deleteError: "Silme işlemi başarısız.",
    deleting: "Siliniyor…",
    bulkDelete: "Seçilenleri Sil",
    bulkDeleteConfirm: "Toplu Silme Onayı",
    bulkDeleteWarning: "Seçilen tüm workspace'ler, verileri ve kullanıcı hesapları kalıcı olarak silinecek.",
    bulkDeleteCodePrompt: "Onaylamak için aşağıdaki kodu kopyalayıp yapıştırın:",
    bulkDeleteCopy: "Kopyala",
    bulkDeleteCopied: "Kopyalandı!",
    bulkDeleteError: "Toplu silme başarısız.",
    selectAll: "Tümünü Seç",
    deselectAll: "Seçimi Kaldır",
    selected: "seçildi",
    tabMessages: "Mesajlar",
    messagesEmpty: "Henüz mesaj yok.",
    messagesLoadError: "Mesajlar yüklenemedi.",
    messagesAnonymous: "İsimsiz",
    messagesNoEmail: "E-posta yok",
    messagesMarkRead: "Okundu işaretle",
    messagesUnread: "Okunmamış",
    messagesRead: "Okundu",
    messagesFilterUnread: "Sadece okunmamışlar",
    messagesFilterAll: "Tümü",
    messagesFilterArchived: "Arşiv",
    messagesArchive: "Arşivle",
    messagesArchiveAll: "Tümünü Arşivle",
    messagesArchived: "Arşivlendi",
    messagesArchiveInfo: "Okunmuş mesajlar 30 günde arşivlenir, 12 ayda kalıcı silinir.",
    home: "Ana Sayfa",
    copySlug: "Kopyala",
    slugCopied: "Kopyalandı!",
    auditLast24h: "Son 24s",
    auditLast7d: "Son 7g",
    auditLast30d: "Son 30g",
    auditAllTime: "Tümü",
    auditShowIp: "IP göster",
    auditHideIp: "IP gizle",
  },
  en: {
    loginTitle: "Platform Owner Login",
    loginDesc: "2FA protected owner console.",
    email: "Email",
    password: "Password",
    totp: "TOTP code (6 digits)",
    login: "Login",
    logging: "Logging in…",
    owner: "Owner Console",
    title: "Platform Management Console",
    refresh: "Refresh",
    public: "Public",
    admin: "Admin",
    impersonate: "Impersonate",
    impersonateReason: "Reason for impersonation (min. 5 chars)",
    impersonateCancel: "Cancel",
    impersonateConfirm: "Confirm",
    activeTenants: "Active",
    totalTenants: "Total Tenants",
    queue: "Queue",
    backup: "Backup",
    restore: "Restore Check",
    observability: "Observability",
    search: "Search",
    redis: "Redis",
    configured: "✓ active",
    notConfigured: "missing",
    logout: "Log Out",
    noTenants: "No workspaces registered yet.",
    loginFailed: "Login failed.",
    statusError: "Failed to update status.",
    loadError: "Failed to load data.",
    tabTenants: "Tenants",
    tabAudit: "Audit Log",
    filterPlaceholder: "Search by name or slug…",
    createdAt: "Registered",
    suspend: "Suspend",
    activate: "Activate",
    pending: "Pending",
    auditLoadMore: "Load More",
    auditLoading: "Loading…",
    auditEmpty: "No events found.",
    auditFilter: "Filter by action…",
    tabBranding: "Branding",
    brandingTitle: "Site Name & Logo",
    brandingDesc: "Change the site name and logo shown on the homepage.",
    brandingSiteName: "Site Name",
    brandingLogoLabel: "Logo (URL or upload a file)",
    brandingLogoPlaceholder: "https://... or leave empty",
    brandingUpload: "Choose File",
    brandingClearLogo: "Clear Logo",
    brandingSave: "Save",
    brandingSaving: "Saving…",
    brandingSaved: "Saved!",
    brandingPreview: "Preview",
    brandingLoadError: "Failed to load branding settings.",
    brandingSaveError: "Failed to save.",
    delete: "Delete",
    deleteConfirm: "Delete Workspace",
    deleteWarning: "This action cannot be undone. All data, the schema and user account will be permanently deleted.",
    deleteSlugPrompt: "Type the workspace slug to confirm:",
    deleteError: "Delete failed.",
    deleting: "Deleting…",
    bulkDelete: "Delete Selected",
    bulkDeleteConfirm: "Bulk Delete Confirmation",
    bulkDeleteWarning: "All selected workspaces, their data and user accounts will be permanently deleted.",
    bulkDeleteCodePrompt: "Copy and paste the code below to confirm:",
    bulkDeleteCopy: "Copy",
    bulkDeleteCopied: "Copied!",
    bulkDeleteError: "Bulk delete failed.",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    selected: "selected",
    tabMessages: "Messages",
    messagesEmpty: "No messages yet.",
    messagesLoadError: "Failed to load messages.",
    messagesAnonymous: "No name",
    messagesNoEmail: "No email",
    messagesMarkRead: "Mark as read",
    messagesUnread: "Unread",
    messagesRead: "Read",
    messagesFilterUnread: "Unread only",
    messagesFilterAll: "All",
    messagesFilterArchived: "Archive",
    messagesArchive: "Archive",
    messagesArchiveAll: "Archive All Read",
    messagesArchived: "Archived",
    messagesArchiveInfo: "Read messages are auto-archived after 30 days and permanently deleted after 12 months.",
    home: "Home",
    copySlug: "Copy",
    slugCopied: "Copied!",
    auditLast24h: "Last 24h",
    auditLast7d: "Last 7d",
    auditLast30d: "Last 30d",
    auditAllTime: "All time",
    auditShowIp: "Show IP",
    auditHideIp: "Hide IP",
  },
  ar: {
    loginTitle: "تسجيل دخول مالك المنصة",
    loginDesc: "لوحة إدارة محمية بالمصادقة الثنائية.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    totp: "رمز TOTP (6 أرقام)",
    login: "تسجيل الدخول",
    logging: "جارٍ تسجيل الدخول…",
    owner: "لوحة المالك",
    title: "لوحة إدارة المنصة",
    refresh: "تحديث",
    public: "عام",
    admin: "إدارة",
    impersonate: "انتحال",
    impersonateReason: "سبب الانتحال (5 أحرف على الأقل)",
    impersonateCancel: "إلغاء",
    impersonateConfirm: "تأكيد",
    activeTenants: "نشط",
    totalTenants: "إجمالي المستأجرين",
    queue: "قائمة الانتظار",
    backup: "النسخ الاحتياطي",
    restore: "اختبار الاستعادة",
    observability: "المراقبة",
    search: "البحث",
    redis: "Redis",
    configured: "✓ نشط",
    notConfigured: "ناقص",
    logout: "تسجيل الخروج",
    noTenants: "لا توجد مساحات عمل مسجلة بعد.",
    loginFailed: "فشل تسجيل الدخول.",
    statusError: "فشل تحديث الحالة.",
    loadError: "فشل تحميل البيانات.",
    tabTenants: "المستأجرون",
    tabAudit: "سجل التدقيق",
    filterPlaceholder: "ابحث بالاسم أو المعرف…",
    createdAt: "تاريخ التسجيل",
    suspend: "تعليق",
    activate: "تفعيل",
    pending: "قيد الانتظار",
    auditLoadMore: "تحميل المزيد",
    auditLoading: "جارٍ التحميل…",
    auditEmpty: "لم يتم العثور على أحداث.",
    auditFilter: "فلترة حسب الإجراء…",
    tabBranding: "العلامة التجارية",
    brandingTitle: "اسم الموقع والشعار",
    brandingDesc: "تغيير اسم الموقع والشعار الظاهر في الصفحة الرئيسية.",
    brandingSiteName: "اسم الموقع",
    brandingLogoLabel: "الشعار (رابط أو رفع ملف)",
    brandingLogoPlaceholder: "https://... أو اتركه فارغاً",
    brandingUpload: "اختر ملفاً",
    brandingClearLogo: "مسح الشعار",
    brandingSave: "حفظ",
    brandingSaving: "جارٍ الحفظ…",
    brandingSaved: "تم الحفظ!",
    brandingPreview: "معاينة",
    brandingLoadError: "فشل تحميل إعدادات العلامة التجارية.",
    brandingSaveError: "فشل الحفظ.",
    delete: "حذف",
    deleteConfirm: "حذف مساحة العمل",
    deleteWarning: "لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع البيانات والمخطط وحساب المستخدم نهائياً.",
    deleteSlugPrompt: "اكتب معرف مساحة العمل للتأكيد:",
    deleteError: "فشل الحذف.",
    deleting: "جارٍ الحذف…",
    bulkDelete: "حذف المحدد",
    bulkDeleteConfirm: "تأكيد الحذف الجماعي",
    bulkDeleteWarning: "سيتم حذف جميع مساحات العمل المحددة وبياناتها وحسابات المستخدمين نهائياً.",
    bulkDeleteCodePrompt: "انسخ والصق الرمز أدناه للتأكيد:",
    bulkDeleteCopy: "نسخ",
    bulkDeleteCopied: "تم النسخ!",
    bulkDeleteError: "فشل الحذف الجماعي.",
    selectAll: "تحديد الكل",
    deselectAll: "إلغاء التحديد",
    selected: "محدد",
    tabMessages: "الرسائل",
    messagesEmpty: "لا توجد رسائل بعد.",
    messagesLoadError: "فشل تحميل الرسائل.",
    messagesAnonymous: "بلا اسم",
    messagesNoEmail: "بلا بريد",
    messagesMarkRead: "تحديد كمقروء",
    messagesUnread: "غير مقروء",
    messagesRead: "مقروء",
    messagesFilterUnread: "غير المقروءة فقط",
    messagesFilterAll: "الكل",
    messagesFilterArchived: "الأرشيف",
    messagesArchive: "أرشفة",
    messagesArchiveAll: "أرشفة المقروءة",
    messagesArchived: "مؤرشف",
    messagesArchiveInfo: "تُؤرشف الرسائل المقروءة تلقائياً بعد 30 يوماً وتُحذف نهائياً بعد 12 شهراً.",
    home: "الصفحة الرئيسية",
    copySlug: "نسخ",
    slugCopied: "تم النسخ!",
    auditLast24h: "آخر 24س",
    auditLast7d: "آخر 7أ",
    auditLast30d: "آخر 30أ",
    auditAllTime: "الكل",
    auditShowIp: "عرض IP",
    auditHideIp: "إخفاء IP",
  },
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
function readCookie(name: string) {
  const hit = document.cookie.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
}

function hasPlatformAuthCookie() {
  return Boolean(readCookie("platform_csrf"));
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const csrf = readCookie("platform_csrf");
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const res = await fetch(`/api/platform${path}`, { ...init, credentials: "include", headers });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.detail || j?.error?.message || j?.message || `HTTP ${res.status}`;
    } catch { detail = await res.text(); }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* action → color badge */
const ACTION_STYLE: Record<string, string> = {
  "platform.": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  "auth.":     "bg-violet-100  text-violet-800  dark:bg-violet-900/50  dark:text-violet-300",
  "admin.":    "bg-blue-100    text-blue-800    dark:bg-blue-900/50    dark:text-blue-300",
  "security.": "bg-red-100     text-red-800     dark:bg-red-900/50     dark:text-red-300",
  "content.":  "bg-amber-100   text-amber-800   dark:bg-amber-900/50   dark:text-amber-300",
};

function auditBadgeStyle(action: string): string {
  for (const [prefix, cls] of Object.entries(ACTION_STYLE)) {
    if (action.startsWith(prefix)) return cls;
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

/* Human-readable labels for known audit actions — per language */
const ACTION_LABELS: Record<Lang, Record<string, string>> = {
  tr: {
    "auth.signup_created":               "Yeni kayıt",
    "auth.signup_conflict":              "Kayıt çakışması",
    "auth.email_verified":               "E-posta doğrulandı",
    "auth.login_failed":                 "Giriş başarısız",
    "auth.workspace_selected":           "Workspace seçildi",
    "auth.workspace_select_failed":      "Workspace seçimi başarısız",
    "auth.forgot_password_requested":    "Şifre sıfırlama istendi",
    "auth.password_reset_completed":     "Şifre sıfırlandı",
    "admin.login_success":               "Admin girişi",
    "admin.login_failed":                "Admin girişi başarısız",
    "admin.logout":                      "Admin çıkışı",
    "admin.user_created":                "Admin kullanıcı oluşturuldu",
    "admin.user_deleted":                "Admin kullanıcı silindi",
    "admin.password_changed":            "Şifre değiştirildi",
    "admin.search_reindex_queued":       "Arama yeniden indekslendi",
    "admin.search_reindex_queue_failed": "Yeniden indeksleme başarısız",
    "platform.login_success":            "Platform owner girişi",
    "platform.login_failed":             "Platform owner girişi başarısız",
    "platform.login_failed_totp":        "TOTP kodu hatalı",
    "platform.logout":                   "Platform owner çıkışı",
    "platform.tenant_status_changed":    "Tenant durumu değişti",
    "platform.tenant_plan_changed":      "Plan değiştirildi",
    "platform.tenant_deleted":           "Tenant silindi",
    "platform.tenants_bulk_deleted":     "Toplu tenant silme",
    "platform.impersonation_started":    "Impersonation başlatıldı",
    "security.session_revoked":          "Oturum iptal edildi",
    "content.category_created":          "Kategori oluşturuldu",
    "content.category_updated":          "Kategori güncellendi",
    "content.category_deleted":          "Kategori silindi",
    "content.heading_created":           "Başlık oluşturuldu",
    "content.heading_deleted":           "Başlık silindi",
    "content.content_created":           "İçerik oluşturuldu",
    "content.content_updated":           "İçerik güncellendi",
    "content.content_deleted":           "İçerik silindi",
  },
  en: {
    "auth.signup_created":               "New signup",
    "auth.signup_conflict":              "Signup conflict",
    "auth.email_verified":               "Email verified",
    "auth.login_failed":                 "Login failed",
    "auth.workspace_selected":           "Workspace selected",
    "auth.workspace_select_failed":      "Workspace selection failed",
    "auth.forgot_password_requested":    "Password reset requested",
    "auth.password_reset_completed":     "Password reset",
    "admin.login_success":               "Admin login",
    "admin.login_failed":                "Admin login failed",
    "admin.logout":                      "Admin logout",
    "admin.user_created":                "Admin user created",
    "admin.user_deleted":                "Admin user deleted",
    "admin.password_changed":            "Password changed",
    "admin.search_reindex_queued":       "Search reindexed",
    "admin.search_reindex_queue_failed": "Reindex failed",
    "platform.login_success":            "Platform owner login",
    "platform.login_failed":             "Platform owner login failed",
    "platform.login_failed_totp":        "Invalid TOTP code",
    "platform.logout":                   "Platform owner logout",
    "platform.tenant_status_changed":    "Tenant status changed",
    "platform.tenant_plan_changed":      "Plan changed",
    "platform.tenant_deleted":           "Tenant deleted",
    "platform.tenants_bulk_deleted":     "Bulk tenant delete",
    "platform.impersonation_started":    "Impersonation started",
    "security.session_revoked":          "Session revoked",
    "content.category_created":          "Category created",
    "content.category_updated":          "Category updated",
    "content.category_deleted":          "Category deleted",
    "content.heading_created":           "Heading created",
    "content.heading_deleted":           "Heading deleted",
    "content.content_created":           "Content created",
    "content.content_updated":           "Content updated",
    "content.content_deleted":           "Content deleted",
  },
  ar: {
    "auth.signup_created":               "تسجيل جديد",
    "auth.signup_conflict":              "تعارض في التسجيل",
    "auth.email_verified":               "تم التحقق من البريد",
    "auth.login_failed":                 "فشل تسجيل الدخول",
    "auth.workspace_selected":           "تم اختيار مساحة العمل",
    "auth.workspace_select_failed":      "فشل اختيار مساحة العمل",
    "auth.forgot_password_requested":    "طُلب إعادة تعيين كلمة المرور",
    "auth.password_reset_completed":     "تمت إعادة تعيين كلمة المرور",
    "admin.login_success":               "دخول المشرف",
    "admin.login_failed":                "فشل دخول المشرف",
    "admin.logout":                      "خروج المشرف",
    "admin.user_created":                "إنشاء مستخدم مشرف",
    "admin.user_deleted":                "حذف مستخدم مشرف",
    "admin.password_changed":            "تغيير كلمة المرور",
    "admin.search_reindex_queued":       "إعادة فهرسة البحث",
    "admin.search_reindex_queue_failed": "فشل إعادة الفهرسة",
    "platform.login_success":            "دخول مالك المنصة",
    "platform.login_failed":             "فشل دخول مالك المنصة",
    "platform.login_failed_totp":        "رمز TOTP غير صحيح",
    "platform.logout":                   "خروج مالك المنصة",
    "platform.tenant_status_changed":    "تغيير حالة المستأجر",
    "platform.tenant_plan_changed":      "تغيير الخطة",
    "platform.tenant_deleted":           "حذف المستأجر",
    "platform.tenants_bulk_deleted":     "حذف جماعي للمستأجرين",
    "platform.impersonation_started":    "بدء الانتحال",
    "security.session_revoked":          "إلغاء الجلسة",
    "content.category_created":          "إنشاء تصنيف",
    "content.category_updated":          "تحديث تصنيف",
    "content.category_deleted":          "حذف تصنيف",
    "content.heading_created":           "إنشاء عنوان",
    "content.heading_deleted":           "حذف عنوان",
    "content.content_created":           "إنشاء محتوى",
    "content.content_updated":           "تحديث محتوى",
    "content.content_deleted":           "حذف محتوى",
  },
};

/* Icon for each action group */
function actionIcon(action: string) {
  if (action.startsWith("auth.") || action.startsWith("admin.login") || action.startsWith("platform.login")) {
    return <Key className="h-3 w-3" />;
  }
  if (action.startsWith("security.")) return <AlertTriangle className="h-3 w-3" />;
  if (action.startsWith("platform.")) return <Shield className="h-3 w-3" />;
  if (action.startsWith("admin.")) return <User className="h-3 w-3" />;
  if (action.startsWith("content.")) return <Activity className="h-3 w-3" />;
  return null;
}

const LANG_LOCALE: Record<Lang, string> = { tr: "tr-TR", en: "en-US", ar: "ar" };

function relativeTime(iso: string, lang: Lang): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    const rtf = new Intl.RelativeTimeFormat(LANG_LOCALE[lang], { numeric: "auto" });
    if (s < 60)   return rtf.format(-s, "second");
    const m = Math.floor(s / 60);
    if (m < 60)   return rtf.format(-m, "minute");
    const h = Math.floor(m / 60);
    if (h < 24)   return rtf.format(-h, "hour");
    const d = Math.floor(h / 24);
    return rtf.format(-d, "day");
  } catch { return ""; }
}

/* keys to hide from metadata display (noisy / not useful) */
const NOISE_KEYS = new Set(["user_agent", "request_id", "path", "method"]);

function renderMeta(meta: Record<string, any> | null): { key: string; value: string }[] {
  if (!meta) return [];
  return Object.entries(meta)
    .filter(([k]) => !NOISE_KEYS.has(k))
    .map(([k, v]) => ({ key: k, value: String(v ?? "") }))
    .slice(0, 6);
}

const STATUS_STYLE: Record<string, string> = {
  active:               "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  suspended:            "bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300",
  pending_verification: "bg-amber-100  text-amber-800  dark:bg-amber-900/40  dark:text-amber-300",
};

function fmtDate(iso: string, lang: Lang) {
  try { return new Date(iso).toLocaleDateString(LANG_LOCALE[lang], { year: "numeric", month: "short", day: "numeric" }); }
  catch { return iso; }
}

function fmtDateTime(iso: string, lang: Lang) {
  try { return new Date(iso).toLocaleString(LANG_LOCALE[lang], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

/* ─── Component ───────────────────────────────────────────────────── */
export default function PlatformAdminClient() {
  const [lang, setLang] = useState<Lang>("tr");
  const [loggedIn, setLoggedIn] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [ops, setOps] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("tenants");

  // login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // dashboard
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [dashError, setDashError] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [impersonateTenant, setImpersonateTenant] = useState<Tenant | null>(null);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonateLoading, setImpersonateLoading] = useState(false);

  // delete
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [deleteSlugInput, setDeleteSlugInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSlugCopied, setDeleteSlugCopied] = useState(false);

  // bulk select & bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkConfirmCode] = useState(() => "DEL-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [bulkCodeInput, setBulkCodeInput] = useState("");
  const [bulkCopied, setBulkCopied] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // audit log
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditShowIp, setAuditShowIp] = useState(false);
  const [auditDateFilter, setAuditDateFilter] = useState<"24h" | "7d" | "30d" | "all">("all");

  // branding
  const [brandingSiteName, setBrandingSiteName] = useState("DocSpace");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [brandingError, setBrandingError] = useState("");

  // contact messages
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [messagesUnreadOnly, setMessagesUnreadOnly] = useState(false);
  const [messagesShowArchived, setMessagesShowArchived] = useState(false);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const MESSAGES_LIMIT = 30;

  const copy = COPY[lang];

  function changeLang(l: Lang) {
    setLang(l);
    try { localStorage.setItem("appLanguage", l); } catch {}
  }

  async function load() {
    const [rows, status] = await Promise.all([
      api("/tenants"),
      api("/ops/status").catch(() => null),
    ]);
    setTenants(rows);
    setOps(status);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("appLanguage") as Lang | null;
      if (saved === "tr" || saved === "en" || saved === "ar") setLang(saved);
    } catch {}
    if (hasPlatformAuthCookie()) {
      load().then(() => setLoggedIn(true)).catch(() => setLoggedIn(false));
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password, totp_code: totpCode }) });
      await load();
      setLoggedIn(true);
    } catch (err: any) {
      const message = String(err?.message || "");
      setLoginError(
        message.includes("Invalid platform credentials") || message.includes("Invalid TOTP")
          ? copy.loginFailed
          : message || copy.loginFailed
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try { await api("/auth/logout", { method: "POST" }); } catch {}
    setLoggedIn(false);
    setTenants([]);
    setOps(null);
    setAuditItems([]);
    setAuditCursor(null);
    setDashError("");
  }

  async function handleRefresh() {
    setRefreshLoading(true);
    setDashError("");
    try { await load(); }
    catch (err: any) { setDashError(err?.message || copy.loadError); }
    finally { setRefreshLoading(false); }
  }

  async function setStatus(id: string, status: string) {
    setDashError("");
    try {
      await api(`/tenants/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (err: any) { setDashError(err?.message || copy.statusError); }
  }

  async function confirmImpersonate() {
    if (!impersonateTenant || impersonateReason.trim().length < 5) return;
    setImpersonateLoading(true);
    try {
      const result = await api(`/tenants/${impersonateTenant.id}/impersonate`, {
        method: "POST",
        body: JSON.stringify({ reason: impersonateReason.trim(), minutes: 15 }),
      });
      window.location.href = result.admin_url;
    } catch (err: any) {
      setDashError(err?.message || "Impersonate failed");
      setImpersonateTenant(null);
      setImpersonateReason("");
    } finally {
      setImpersonateLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function copyBulkCode() {
    navigator.clipboard.writeText(bulkConfirmCode).then(() => {
      setBulkCopied(true);
      setTimeout(() => setBulkCopied(false), 2000);
    });
  }

  async function handleBulkDelete() {
    if (bulkCodeInput !== bulkConfirmCode) return;
    setBulkLoading(true);
    try {
      await api("/tenants/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ tenant_ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setBulkCodeInput("");
      await load();
    } catch (err: any) {
      setDashError(err?.message || copy.bulkDeleteError);
      setBulkDeleteOpen(false);
      setBulkCodeInput("");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTenant || deleteSlugInput !== deleteTenant.slug) return;
    setDeleteLoading(true);
    try {
      await api(`/tenants/${deleteTenant.id}`, { method: "DELETE" });
      setDeleteTenant(null);
      setDeleteSlugInput("");
      await load();
    } catch (err: any) {
      setDashError(err?.message || copy.deleteError);
      setDeleteTenant(null);
      setDeleteSlugInput("");
    } finally {
      setDeleteLoading(false);
    }
  }

  function copyDeleteSlug() {
    if (!deleteTenant) return;
    navigator.clipboard.writeText(deleteTenant.slug).then(() => {
      setDeleteSlugCopied(true);
      setTimeout(() => setDeleteSlugCopied(false), 2000);
    });
  }

  async function loadAudit(cursor?: string, dateFilter?: "24h" | "7d" | "30d" | "all") {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      if (auditActionFilter.trim()) params.set("action", auditActionFilter.trim());
      // Date range filter — backend supports ?from= alias
      const df = dateFilter ?? auditDateFilter;
      if (df !== "all") {
        const ms = df === "24h" ? 86400000 : df === "7d" ? 604800000 : 2592000000;
        params.set("from", new Date(Date.now() - ms).toISOString());
      }
      const data = await api(`/audit?${params}`);
      setAuditItems((prev) => cursor ? [...prev, ...data.items] : data.items);
      setAuditCursor(data.next_cursor);
    } catch (err: any) {
      setDashError(err?.message || copy.loadError);
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadMessages(reset = false) {
    setMessagesLoading(true);
    setMessagesError("");
    const currentOffset = reset ? 0 : messagesOffset;
    try {
      const params = new URLSearchParams({
        limit: String(MESSAGES_LIMIT + 1),
        offset: String(currentOffset),
      });
      if (messagesUnreadOnly) params.set("unread_only", "true");
      if (messagesShowArchived) params.set("archived", "true");
      const data: ContactMessage[] = await api(`/admin/contact-messages?${params}`);
      const hasNext = data.length > MESSAGES_LIMIT;
      if (reset) {
        setMessages(data.slice(0, MESSAGES_LIMIT));
        setMessagesOffset(MESSAGES_LIMIT);
      } else {
        setMessages((prev) => [...prev, ...data.slice(0, MESSAGES_LIMIT)]);
        setMessagesOffset(currentOffset + MESSAGES_LIMIT);
      }
      setMessagesHasMore(hasNext);
    } catch (err: any) {
      setMessagesError(err?.message || copy.messagesLoadError);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function markMessageRead(id: string) {
    try {
      await api(`/admin/contact-messages/${id}/read`, { method: "PATCH" });
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
    } catch {}
  }

  async function archiveMessage(id: string) {
    try {
      await api(`/admin/contact-messages/${id}/archive`, { method: "PATCH" });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {}
  }

  async function archiveAllRead() {
    try {
      await api("/admin/contact-messages/archive-read", { method: "POST" });
      // sadece okunmuşları listeden çıkar, okunmayanlar kalsın
      setMessages((prev) => prev.filter((m) => !m.read));
    } catch {}
  }

  useEffect(() => {
    if (loggedIn && tab === "audit") {
      setAuditItems([]);
      setAuditCursor(null);
      loadAudit();
    }
    if (loggedIn && tab === "branding" && !brandingLoaded) {
      loadBranding();
    }
    if (loggedIn && tab === "messages") {
      setMessages([]);
      setMessagesOffset(0);
      loadMessages(true);
    }
  }, [tab, loggedIn]);

  async function loadBranding() {
    setBrandingError("");
    try {
      const data = await api("/branding");
      setBrandingSiteName(data.site_name ?? "DocSpace");
      setBrandingLogoUrl(data.site_logo ?? "");
      setBrandingLoaded(true);
    } catch (err: any) {
      setBrandingError(err?.message || copy.brandingLoadError);
    }
  }

  async function saveBranding() {
    setBrandingSaving(true);
    setBrandingSaved(false);
    setBrandingError("");
    try {
      await api("/branding", {
        method: "PUT",
        body: JSON.stringify({ site_name: brandingSiteName.trim(), site_logo: brandingLogoUrl }),
      });
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 3000);
    } catch (err: any) {
      setBrandingError(err?.message || copy.brandingSaveError);
    } finally {
      setBrandingSaving(false);
    }
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setBrandingLogoUrl(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const filteredTenants = useMemo(() => {
    const q = tenantFilter.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  }, [tenants, tenantFilter]);

  /* ── Ops metric list ───────────────────────────────────────────── */
  const opsMetrics = ops ? ([
    [copy.totalTenants,   ops.tenants],
    [copy.activeTenants,  ops.active_tenants],
    [copy.queue,  ops.queue?.worker_alive ? copy.configured : (ops.queue?.message || copy.notConfigured)],
    [copy.redis,  ops.redis?.configured   ? copy.configured : copy.notConfigured],
    [copy.backup, ops.backup?.last_backup?.ok ? copy.configured : (ops.backup?.last_backup?.message || copy.notConfigured)],
    [copy.restore,ops.backup?.last_restore_check?.ok ? copy.configured : (ops.backup?.last_restore_check?.message || copy.notConfigured)],
    [copy.observability, ops.observability?.sentry?.configured ? "Sentry" : copy.notConfigured],
    [copy.search, ops.search?.configured  ? copy.configured : copy.notConfigured],
  ] as [string, any][]) : [];

  /* ════════════════════════════════════════════════════════════════
     LOGIN SCREEN
  ═══════════════════════════════════════════════════════════════ */
  if (!loggedIn) {
    return (
      <main className="login-stage flex min-h-screen items-center justify-center px-4 py-8">
        <section className="login-card w-full max-w-md rounded-[1.35rem] p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Owner Console</span>
            </div>
            {/* Modern pill language switcher */}
            <div className="flex gap-1 rounded-full border border-gray-200 bg-gray-100/80 p-0.5 dark:border-white/20 dark:bg-white/10">
              {(["tr", "en", "ar"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => changeLang(l)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                    lang === l
                      ? "bg-white text-gray-900 shadow-sm dark:bg-white dark:text-gray-900"
                      : "text-gray-500 hover:text-gray-800 dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {copy.loginTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{copy.loginDesc}</p>

          <form className="mt-7 space-y-4" onSubmit={handleLogin}>
            <input
              className="login-input min-h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-gray-400"
              placeholder={copy.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
            <div className="relative">
              <input
                className="login-input min-h-12 w-full rounded-2xl px-4 pr-12 text-sm outline-none placeholder:text-gray-400"
                placeholder={copy.password}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-emerald-500 dark:hover:text-emerald-400">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <input
              className="login-input min-h-12 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-gray-400"
              placeholder={copy.totp}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
            />
            {loginError && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                {loginError}
              </p>
            )}
            <button type="submit" disabled={loginLoading}
              className="login-primary min-h-12 w-full rounded-2xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {loginLoading ? copy.logging : copy.login}
            </button>
          </form>
        </section>
      </main>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     DASHBOARD
  ═══════════════════════════════════════════════════════════════ */
  return (
    <main dir={lang === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-200 px-3 py-5 text-gray-950 dark:bg-gray-950 dark:text-gray-100 sm:px-6">

      {/* ── Bulk delete modal ─────────────────────────────────────── */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <h2 className="font-bold text-red-600 dark:text-red-400">{copy.bulkDeleteConfirm}</h2>
                <p className="text-sm text-gray-500">{selectedIds.size} workspace {copy.selected}</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {copy.bulkDeleteWarning}
            </p>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{copy.bulkDeleteCodePrompt}</p>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-red-300 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30">
                <span className="flex-1 font-mono text-sm font-bold tracking-widest text-red-700 dark:text-red-300 select-all">
                  {bulkConfirmCode}
                </span>
                <button onClick={copyBulkCode}
                  className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-200 dark:bg-red-900 dark:text-red-200">
                  {bulkCopied ? copy.bulkDeleteCopied : copy.bulkDeleteCopy}
                </button>
              </div>
              <input
                className="mt-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder={bulkConfirmCode}
                value={bulkCodeInput}
                onChange={(e) => setBulkCodeInput(e.target.value.toUpperCase())}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setBulkDeleteOpen(false); setBulkCodeInput(""); }}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
                {copy.impersonateCancel}
              </button>
              <button onClick={handleBulkDelete}
                disabled={bulkCodeInput !== bulkConfirmCode || bulkLoading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
                {bulkLoading ? copy.deleting : copy.bulkDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ───────────────────────────────────────────── */}
      {deleteTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-red-600 dark:text-red-400">{copy.deleteConfirm}: {deleteTenant.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-500">/{deleteTenant.slug}</span>
                  <button
                    type="button"
                    onClick={copyDeleteSlug}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {deleteSlugCopied
                      ? <><Check className="h-3 w-3 text-emerald-500" />{copy.slugCopied}</>
                      : <><Copy className="h-3 w-3" />{copy.copySlug}</>
                    }
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {copy.deleteWarning}
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                {copy.deleteSlugPrompt}
              </label>
              <input
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder={deleteTenant.slug}
                value={deleteSlugInput}
                onChange={(e) => setDeleteSlugInput(e.target.value)}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setDeleteTenant(null); setDeleteSlugInput(""); }}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
                {copy.impersonateCancel}
              </button>
              <button onClick={handleDelete}
                disabled={deleteSlugInput !== deleteTenant.slug || deleteLoading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60">
                {deleteLoading ? copy.deleting : copy.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Impersonate modal ──────────────────────────────────────── */}
      {impersonateTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h2 className="font-bold">{copy.impersonate}: {impersonateTenant.name}</h2>
                <p className="text-sm text-gray-500">/{impersonateTenant.slug}</p>
              </div>
            </div>
            <textarea
              className="mt-4 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              rows={3}
              placeholder={copy.impersonateReason}
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setImpersonateTenant(null); setImpersonateReason(""); }}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
                {copy.impersonateCancel}
              </button>
              <button onClick={confirmImpersonate}
                disabled={impersonateReason.trim().length < 5 || impersonateLoading}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
                {impersonateLoading ? "…" : copy.impersonateConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl">

        {/* ── Top bar ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{copy.owner}</p>
              <h1 className="text-lg font-bold leading-tight sm:text-xl">{copy.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={lang} onChange={(e) => changeLang(e.target.value as Lang)}
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-gray-700 dark:bg-gray-900">
              <option value="tr">TR</option>
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
            <a href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
              <Home className="h-3.5 w-3.5" />
              {copy.home}
            </a>
            <button onClick={handleRefresh} disabled={refreshLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshLoading ? "animate-spin" : ""}`} />
              {copy.refresh}
            </button>
            <button onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900">
              <LogOut className="h-3.5 w-3.5" />
              {copy.logout}
            </button>
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────────── */}
        {dashError && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
            {dashError}
          </p>
        )}

        {/* ── Ops metrics ───────────────────────────────────────────── */}
        {opsMetrics.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {opsMetrics.map(([label, value]) => (
              <article key={label} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                <p className="truncate text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-0.5 text-base font-bold">{String(value ?? "-")}</p>
              </article>
            ))}
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900 sm:w-fit">
          {([["tenants", copy.tabTenants], ["audit", copy.tabAudit], ["branding", copy.tabBranding], ["messages", copy.tabMessages]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                tab === key
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}>
              {label}
              {key === "tenants" && <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">{tenants.length}</span>}
              {key === "messages" && messages.filter((m) => !m.read).length > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                  {messages.filter((m) => !m.read).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB: TENANTS
        ══════════════════════════════════════════════════════════ */}
        {tab === "tenants" && (
          <div className="mt-4">
            {/* Search + bulk actions */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                  placeholder={copy.filterPlaceholder}
                  className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={() => setSelectedIds(
                  selectedIds.size === filteredTenants.length
                    ? new Set()
                    : new Set(filteredTenants.map((t) => t.id))
                )}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
                {selectedIds.size === filteredTenants.length && filteredTenants.length > 0 ? copy.deselectAll : copy.selectAll}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setBulkDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                  {copy.bulkDelete} ({selectedIds.size})
                </button>
              )}
            </div>

            {filteredTenants.length === 0 && (
              <p className="text-sm text-gray-500">{copy.noTenants}</p>
            )}

            <div className="grid gap-3">
              {filteredTenants.map((tenant) => (
                <article key={tenant.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">

                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tenant.id)}
                      onChange={() => toggleSelect(tenant.id)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-red-600"
                    />
                    <h2 className="min-w-0 flex-1 truncate font-bold">{tenant.name}</h2>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[tenant.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {tenant.status}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span>/{tenant.slug}</span>
                    <span>{tenant.owner_email}</span>
                    {tenant.created_at && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />{fmtDate(tenant.created_at, lang)}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Status toggle */}
                    {tenant.status === "active" ? (
                      <button onClick={() => setStatus(tenant.id, "suspended")}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        {copy.suspend}
                      </button>
                    ) : tenant.status === "suspended" ? (
                      <button onClick={() => setStatus(tenant.id, "active")}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {copy.activate}
                      </button>
                    ) : (
                      <button onClick={() => setStatus(tenant.id, "active")}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {copy.activate}
                      </button>
                    )}

                    <a href={`/d/${tenant.slug}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500">
                      <Globe className="h-3 w-3" />{copy.public}
                    </a>
                    <a href={`/d/${tenant.slug}/admin`}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600">
                      <Settings className="h-3 w-3" />{copy.admin}
                    </a>
                    <button
                      onClick={() => { setImpersonateTenant(tenant); setImpersonateReason(""); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                      <Shield className="h-3 w-3" />{copy.impersonate}
                    </button>
                    <button
                      onClick={() => { setDeleteTenant(tenant); setDeleteSlugInput(""); }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                      <Trash2 className="h-3 w-3" />{copy.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: AUDIT LOG
        ══════════════════════════════════════════════════════════ */}
        {tab === "audit" && (
          <div className="mt-4">
            {/* Filter bar */}
            <div className="mb-4 space-y-2">
              {/* Date range quick filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
                  {(["24h", "7d", "30d", "all"] as const).map((df) => (
                    <button
                      key={df}
                      onClick={() => {
                        setAuditDateFilter(df);
                        setAuditItems([]);
                        setAuditCursor(null);
                        loadAudit(undefined, df);
                      }}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                        auditDateFilter === df
                          ? "bg-emerald-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                      }`}
                    >
                      {df === "24h" ? copy.auditLast24h : df === "7d" ? copy.auditLast7d : df === "30d" ? copy.auditLast30d : copy.auditAllTime}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setAuditShowIp((v) => !v)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    auditShowIp
                      ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                  }`}
                >
                  {auditShowIp ? copy.auditHideIp : copy.auditShowIp}
                </button>
              </div>
              {/* Action filter + refresh */}
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { setAuditItems([]); setAuditCursor(null); loadAudit(); } }}
                    placeholder={copy.auditFilter}
                    className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={() => { setAuditItems([]); setAuditCursor(null); loadAudit(); }}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800">
                  {copy.refresh}
                </button>
              </div>
            </div>

            {auditLoading && auditItems.length === 0 && (
              <p className="text-sm text-gray-500">{copy.auditLoading}</p>
            )}

            {!auditLoading && auditItems.length === 0 && (
              <p className="text-sm text-gray-500">{copy.auditEmpty}</p>
            )}

            <div className="grid gap-2">
              {auditItems.map((item) => {
                const meta = renderMeta(item.metadata);
                const label = ACTION_LABELS[lang][item.action];
                const icon = actionIcon(item.action);
                const emailMeta = item.metadata?.email as string | undefined;
                const slugMeta = (item.metadata?.slug || item.metadata?.tenant_slug) as string | undefined;
                const ipMeta = item.metadata?.ip as string | undefined;
                return (
                  <article key={item.id}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                    {/* Row 1: badge + human label + time */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-xs font-semibold ${auditBadgeStyle(item.action)}`}>
                        {icon}
                        {item.action}
                      </span>
                      {label && (
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                      )}
                      <span className="ms-auto shrink-0 text-xs text-gray-400" title={fmtDateTime(item.created_at, lang)}>
                        {relativeTime(item.created_at, lang)}
                        <span className="ml-1.5 hidden sm:inline text-gray-300 dark:text-gray-600">
                          {fmtDateTime(item.created_at, lang)}
                        </span>
                      </span>
                    </div>
                    {/* Row 2: prominent fields (email, slug) */}
                    {(emailMeta || slugMeta) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        {emailMeta && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                            <User className="h-3 w-3" />
                            {emailMeta}
                          </span>
                        )}
                        {slugMeta && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            /{slugMeta}
                          </span>
                        )}
                        {auditShowIp && ipMeta && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-mono text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            {ipMeta}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Row 3: remaining metadata chips */}
                    {meta.filter(({ key }) => key !== "email" && key !== "slug" && key !== "tenant_slug" && (auditShowIp || key !== "ip")).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-2 dark:border-gray-800">
                        {meta
                          .filter(({ key }) => key !== "email" && key !== "slug" && key !== "tenant_slug" && (auditShowIp || key !== "ip"))
                          .map(({ key, value }) => (
                            <span key={key} className="text-xs">
                              <span className="font-semibold text-gray-500 dark:text-gray-400">{key}: </span>
                              <span className="text-gray-800 dark:text-gray-200">{value}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {auditCursor && (
              <button
                onClick={() => loadAudit(auditCursor)}
                disabled={auditLoading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900">
                <ChevronDown className="h-4 w-4" />
                {auditLoading ? copy.auditLoading : copy.auditLoadMore}
              </button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: BRANDING
        ══════════════════════════════════════════════════════════ */}
        {tab === "branding" && (
          <div className="mt-4 max-w-lg">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-bold">{copy.brandingTitle}</h2>
                  <p className="text-xs text-gray-500">{copy.brandingDesc}</p>
                </div>
              </div>

              {brandingError && (
                <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{brandingError}</p>
              )}

              {/* Site name */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {copy.brandingSiteName}
                </label>
                <input
                  value={brandingSiteName}
                  onChange={(e) => setBrandingSiteName(e.target.value.slice(0, 60))}
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="DocSpace"
                  maxLength={60}
                />
                <p className="mt-1 text-right text-[11px] text-gray-400">{brandingSiteName.length}/60</p>
              </div>

              {/* Logo */}
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {copy.brandingLogoLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    value={brandingLogoUrl}
                    onChange={(e) => setBrandingLogoUrl(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    placeholder={copy.brandingLogoPlaceholder}
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750">
                    <Upload className="h-3.5 w-3.5" />
                    {copy.brandingUpload}
                    <input type="file" accept="image/*" className="sr-only" onChange={handleLogoFile} />
                  </label>
                </div>
                {brandingLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setBrandingLogoUrl("")}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600"
                  >
                    <X className="h-3 w-3" /> {copy.brandingClearLogo}
                  </button>
                )}
              </div>

              {/* Preview */}
              <div className="mb-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.brandingPreview}</p>
                <div className="flex items-center gap-2.5">
                  {brandingLogoUrl ? (
                    <img src={brandingLogoUrl} alt="logo" className="h-8 w-8 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">
                      {(brandingSiteName || "D")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {brandingSiteName || "DocSpace"}
                  </span>
                </div>
              </div>

              {/* Save */}
              <button
                onClick={saveBranding}
                disabled={brandingSaving || !brandingSiteName.trim()}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {brandingSaving ? copy.brandingSaving : brandingSaved ? copy.brandingSaved : copy.brandingSave}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB: MESSAGES (contact form submissions)
        ══════════════════════════════════════════════════════════ */}
        {tab === "messages" && (
          <div className="mt-4">
            {/* Filter bar */}
            <div className="mb-3 flex flex-wrap items-center gap-3">
              {/* View tabs */}
              <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
                <button
                  onClick={() => {
                    setMessagesUnreadOnly(false);
                    setMessagesShowArchived(false);
                    setMessages([]); setMessagesOffset(0); loadMessages(true);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    !messagesUnreadOnly && !messagesShowArchived
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {copy.messagesFilterAll}
                </button>
                <button
                  onClick={() => {
                    setMessagesUnreadOnly(true);
                    setMessagesShowArchived(false);
                    setMessages([]); setMessagesOffset(0); loadMessages(true);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    messagesUnreadOnly
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {copy.messagesFilterUnread}
                </button>
                <button
                  onClick={() => {
                    setMessagesUnreadOnly(false);
                    setMessagesShowArchived(true);
                    setMessages([]); setMessagesOffset(0); loadMessages(true);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    messagesShowArchived
                      ? "bg-gray-600 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {copy.messagesFilterArchived}
                </button>
              </div>

              {/* Archive all read — sadece normal görünümde */}
              {!messagesShowArchived && messages.some((m) => m.read) && (
                <button
                  onClick={archiveAllRead}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Archive className="h-3.5 w-3.5" />
                  {copy.messagesArchiveAll}
                </button>
              )}

              <button
                onClick={() => { setMessages([]); setMessagesOffset(0); loadMessages(true); }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                {copy.refresh}
              </button>
            </div>

            {/* Retention info hint */}
            {!messagesShowArchived && (
              <p className="mb-3 text-[11px] text-gray-400 dark:text-gray-600">
                ℹ︎ {copy.messagesArchiveInfo}
              </p>
            )}

            {messagesError && (
              <p className="mb-3 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">{messagesError}</p>
            )}

            {messagesLoading && messages.length === 0 && (
              <p className="text-sm text-gray-500">{copy.auditLoading}</p>
            )}

            {!messagesLoading && messages.length === 0 && !messagesError && (
              <p className="text-sm text-gray-500">{copy.messagesEmpty}</p>
            )}

            <div className="grid gap-3">
              {messages.map((msg) => (
                <article key={msg.id}
                  className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-gray-900 ${
                    msg.archived
                      ? "border-gray-200 opacity-75 dark:border-gray-800"
                      : msg.read
                        ? "border-gray-200 dark:border-gray-800"
                        : "border-emerald-300 dark:border-emerald-700/60"
                  }`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      msg.archived
                        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                        : msg.read
                          ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    }`}>
                      {msg.archived ? copy.messagesArchived : msg.read ? copy.messagesRead : copy.messagesUnread}
                    </span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {msg.name?.trim() || copy.messagesAnonymous}
                    </span>
                    {msg.email?.trim() ? (
                      <a href={`mailto:${msg.email}`} className="text-xs text-blue-600 hover:underline dark:text-blue-400">{msg.email}</a>
                    ) : (
                      <span className="text-xs text-gray-400">{copy.messagesNoEmail}</span>
                    )}
                    <span className="ms-auto text-xs text-gray-400">{fmtDateTime(msg.created_at, lang)}</span>
                  </div>
                  <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                    {msg.message}
                  </p>
                  {!msg.archived && (
                    <div className="mt-2 flex items-center gap-3">
                      {!msg.read && (
                        <button
                          onClick={() => markMessageRead(msg.id)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                          ✓ {copy.messagesMarkRead}
                        </button>
                      )}
                      <button
                        onClick={() => archiveMessage(msg.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Archive className="h-3 w-3" />
                        {copy.messagesArchive}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {messagesHasMore && (
              <button
                onClick={() => loadMessages(false)}
                disabled={messagesLoading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900">
                <ChevronDown className="h-4 w-4" />
                {messagesLoading ? copy.auditLoading : copy.auditLoadMore}
              </button>
            )}
          </div>
        )}

      </section>
    </main>
  );
}
