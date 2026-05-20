"use client";
import { ArrowRight, BookOpen, Globe, Moon, PenLine, Search, Sun, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "../src/i18n";
import LanguageSwitcher from "../src/shared/components/LanguageSwitcher";

type WorkspaceSuggestion = { slug: string; name: string };

type HomeCopy = {
  navHow: string;
  navPreview: string;
  navUpdates: string;
  navContact: string;
  heroTitle: string;
  heroSubtitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  searchLoading: string;
  searchEmpty: string;
  searchError: string;
  viewDocs: string;
  openAdmin: string;
  createWorkspace: string;
  noWorkspace: string;
  howTitle: string;
  howSubtitle: string;
  steps: [string, string, string];
  stepDesc: [string, string, string];
  previewTitle: string;
  previewSubtitle: string;
  previewSections: Array<{ title: string; chips: string[] }>;
  updatesTitle: string;
  updatesSubtitle: string;
  updatesItems: Array<{ text: string; status: "done" | "progress" | "planned" }>;
  contactTitle: string;
  contactSubtitle: string;
  contactEmail: string;
  contactFaq: string;
  contactDocs: string;
  footerTagline: string;
};

const HOME_COPY: Record<"tr" | "en" | "ar", HomeCopy> = {
  tr: {
    navHow: "Nasıl Çalışır",
    navPreview: "Önizleme",
    navUpdates: "Duyurular",
    navContact: "İletişim",
    heroTitle: "Dokümantasyonunu saniyeler içinde yayınla.",
    heroSubtitle:
      "Workspace oluştur, içeriğini düzenle, public URL ile herkesin erişimine aç. Tüm akış tek platformda.",
    searchLabel: "Workspace Ara",
    searchPlaceholder: "Örn: marketahmet veya workspace adı",
    searchHint: "Yazdıkça aktif public sayfalar listelenir.",
    searchLoading: "Aranıyor…",
    searchEmpty: "Eşleşen public site bulunamadı.",
    searchError: "Arama sırasında bir hata oluştu.",
    viewDocs: "Public Sayfayı Aç",
    openAdmin: "Giriş Yap",
    createWorkspace: "Ücretsiz Başla",
    noWorkspace: "Henüz workspace yok mu?",
    howTitle: "Nasıl Çalışır?",
    howSubtitle: "Üç adımda kayıt ol, içerik üret, yayınla.",
    steps: ["Workspace Oluştur", "İçeriğini Yönet", "Public Olarak Yayınla"],
    stepDesc: [
      "Kayıt ekranından slug belirleyip workspace aç. Dakikalar içinde hazır.",
      "Admin panelinde kategori, başlık ve markdown içerikleri düzenle.",
      "Public URL ile dokümantasyonunu herkesin erişimine aç.",
    ],
    previewTitle: "Public Sayfa Önizleme",
    previewSubtitle: "Tenant public sayfaları bu yapıda görünür.",
    previewSections: [
      { title: "Kurulum", chips: ["Gereksinimler", "Docker", "Ortam Değişkenleri"] },
      { title: "Hızlı Başlangıç", chips: ["İlk İstek", "Kimlik Doğrulama"] },
      { title: "Temel Kavramlar", chips: ["API Yapısı", "Kategori Akışı"] },
    ],
    updatesTitle: "Duyurular",
    updatesSubtitle: "Son geliştirmeler ve yaklaşan özellikler.",
    updatesItems: [
      { text: "Merkezi giriş + workspace seçimi aktif", status: "done" },
      { text: "Mobil admin ve public arayüz iyileştirmeleri", status: "progress" },
      { text: "SEO metrikleri ve arama içgörüleri genişletiliyor", status: "progress" },
      { text: "Çoklu dil içerik desteği", status: "planned" },
    ],
    contactTitle: "İletişim",
    contactSubtitle: "Soru, geri bildirim veya işbirliği için bize ulaş.",
    contactEmail: "destek@docspace.example",
    contactFaq: "Sık Sorulan Sorular",
    contactDocs: "Kullanım Rehberi",
    footerTagline: "Dokümantasyonunu hızlı ve kolay yayınla.",
  },
  en: {
    navHow: "How It Works",
    navPreview: "Preview",
    navUpdates: "Updates",
    navContact: "Contact",
    heroTitle: "Publish your documentation in seconds.",
    heroSubtitle:
      "Create a workspace, manage your content, and share it via a public URL. The entire workflow in one platform.",
    searchLabel: "Search Workspace",
    searchPlaceholder: "e.g. marketahmet or workspace name",
    searchHint: "Active public pages appear instantly while typing.",
    searchLoading: "Searching…",
    searchEmpty: "No matching public site found.",
    searchError: "Something went wrong while searching.",
    viewDocs: "Open Public Site",
    openAdmin: "Login",
    createWorkspace: "Get Started Free",
    noWorkspace: "No workspace yet?",
    howTitle: "How It Works",
    howSubtitle: "Sign up, manage content, and publish in three steps.",
    steps: ["Create Workspace", "Manage Content", "Publish Publicly"],
    stepDesc: [
      "Sign up and choose your workspace slug. Ready in minutes.",
      "Organize categories, headings, and markdown content in admin.",
      "Share your documentation with a public URL anyone can access.",
    ],
    previewTitle: "Public Page Preview",
    previewSubtitle: "Tenant public pages look like this.",
    previewSections: [
      { title: "Setup", chips: ["Requirements", "Docker", "Environment Variables"] },
      { title: "Quick Start", chips: ["First Request", "Authentication"] },
      { title: "Core Concepts", chips: ["API Structure", "Category Flow"] },
    ],
    updatesTitle: "Updates",
    updatesSubtitle: "Latest improvements and upcoming features.",
    updatesItems: [
      { text: "Central login + workspace selection is live", status: "done" },
      { text: "Mobile admin and public UI improvements", status: "progress" },
      { text: "SEO metrics and search insights expansion", status: "progress" },
      { text: "Multi-language content support", status: "planned" },
    ],
    contactTitle: "Contact",
    contactSubtitle: "Reach out for questions, feedback, or collaboration.",
    contactEmail: "support@docspace.example",
    contactFaq: "FAQ",
    contactDocs: "Usage Guide",
    footerTagline: "Publish your documentation fast and easy.",
  },
  ar: {
    navHow: "كيف يعمل",
    navPreview: "معاينة",
    navUpdates: "التحديثات",
    navContact: "التواصل",
    heroTitle: "انشر توثيقك في ثوانٍ.",
    heroSubtitle:
      "أنشئ مساحة عمل، أدر محتواك، وشاركه عبر رابط عام. كل شيء في منصة واحدة.",
    searchLabel: "ابحث عن مساحة العمل",
    searchPlaceholder: "مثال: marketahmet أو اسم المساحة",
    searchHint: "تظهر الصفحات العامة النشطة أثناء الكتابة.",
    searchLoading: "جارٍ البحث…",
    searchEmpty: "لم يتم العثور على موقع عام مطابق.",
    searchError: "حدث خطأ أثناء البحث.",
    viewDocs: "فتح الصفحة العامة",
    openAdmin: "تسجيل الدخول",
    createWorkspace: "ابدأ مجاناً",
    noWorkspace: "لا تملك مساحة عمل بعد؟",
    howTitle: "كيف يعمل؟",
    howSubtitle: "سجّل، أدر المحتوى، وانشر في ثلاث خطوات.",
    steps: ["أنشئ مساحة عمل", "أدر المحتوى", "انشر للعامة"],
    stepDesc: [
      "سجّل وحدد slug لمساحة العمل. جاهز في دقائق.",
      "نظّم الفئات والعناوين والمحتوى من لوحة الإدارة.",
      "شارك التوثيق عبر رابط عام قابل للوصول للجميع.",
    ],
    previewTitle: "معاينة الصفحة العامة",
    previewSubtitle: "صفحات التوثيق العامة تبدو هكذا.",
    previewSections: [
      { title: "الإعداد", chips: ["المتطلبات", "Docker", "متغيرات البيئة"] },
      { title: "البدء السريع", chips: ["الطلب الأول", "التحقق من الهوية"] },
      { title: "المفاهيم الأساسية", chips: ["بنية API", "تدفق الفئات"] },
    ],
    updatesTitle: "التحديثات",
    updatesSubtitle: "آخر التحسينات والميزات القادمة.",
    updatesItems: [
      { text: "تسجيل الدخول المركزي واختيار مساحة العمل متاح الآن", status: "done" },
      { text: "تحسين واجهة الجوال للإدارة والصفحة العامة", status: "progress" },
      { text: "توسيع مقاييس SEO وتحليلات البحث", status: "progress" },
      { text: "دعم المحتوى متعدد اللغات", status: "planned" },
    ],
    contactTitle: "التواصل",
    contactSubtitle: "تواصل معنا للأسئلة أو الملاحظات أو التعاون.",
    contactEmail: "support@docspace.example",
    contactFaq: "الأسئلة الشائعة",
    contactDocs: "دليل الاستخدام",
    footerTagline: "انشر توثيقك بسرعة وسهولة.",
  },
};

const STEP_ICONS = [BookOpen, PenLine, Globe] as const;

const STATUS_DOT: Record<string, string> = {
  done:     "bg-emerald-500",
  progress: "bg-amber-400",
  planned:  "bg-gray-400 dark:bg-gray-600",
};
const STATUS_LABEL: Record<"tr" | "en" | "ar", Record<string, string>> = {
  tr: { done: "Tamamlandı", progress: "Devam ediyor", planned: "Planlandı" },
  en: { done: "Done", progress: "In progress", planned: "Planned" },
  ar: { done: "مكتمل", progress: "جارٍ", planned: "مخطط" },
};

function normalizeSlug(value: string) {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "").replace(/\s+/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function HomeClient() {
  const { i18n } = useTranslation();
  const lang = (i18n.language?.split("-")[0] || "en") as "tr" | "en" | "ar";
  const copy = HOME_COPY[lang] || HOME_COPY.en;
  const isRtl = lang === "ar";

  const [branding, setBranding] = useState<{ site_name: string; site_logo: string }>({
    site_name: "DocSpace",
    site_logo: "",
  });
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<WorkspaceSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const cleanSlug = useMemo(() => normalizeSlug(searchTerm), [searchTerm]);

  useEffect(() => {
    fetch("/api/branding", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setBranding({ site_name: d.site_name || "DocSpace", site_logo: d.site_logo || "" }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme");
    const cookieTheme = document.cookie.split(";").map((c) => c.trim())
      .find((c) => c.startsWith("theme="))?.split("=")[1];
    const persisted = stored || cookieTheme || "";
    const isDark = persisted === "dark" || (!persisted && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  }, [theme]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) { setSuggestions([]); setSearchLoading(false); setSearchError(""); return; }
    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError("");
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/workspaces/suggest?q=${encodeURIComponent(term)}&limit=8`,
          { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        if (!controller.signal.aborted) { setSuggestions([]); setSearchError(copy.searchError); }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [searchTerm, copy.searchError]);

  function goToPublic(slug: string) { if (slug) window.location.href = `/d/${slug}`; }
  function goToAdmin(slug: string) { if (slug) window.location.href = `/login?workspace=${encodeURIComponent(slug)}`; }

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-emerald-600/20 bg-emerald-700/98 shadow-sm backdrop-blur-md dark:border-emerald-900/60 dark:bg-gray-950/98">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/" className="flex shrink-0 items-center gap-2.5">
            {branding.site_logo ? (
              <img src={branding.site_logo} alt={branding.site_name} className="h-8 w-8 rounded-xl object-cover shadow-inner" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white shadow-inner">
                {branding.site_name[0]?.toUpperCase() ?? "D"}
              </div>
            )}
            <span className="text-sm font-bold text-white sm:text-base">{branding.site_name}</span>
          </a>

          <nav className="hidden items-center gap-5 text-xs font-medium text-emerald-100 lg:flex">
            {([["#how", copy.navHow], ["#preview", copy.navPreview], ["#updates", copy.navUpdates], ["#contact", copy.navContact]] as [string, string][])
              .map(([href, label]) => (
                <a key={href} href={href} className="transition-colors hover:text-white">{label}</a>
              ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher compact />
            <button type="button" onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:border-white/40 hover:bg-white/20"
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a href="/login"
              className="hidden rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-white/10 sm:inline-flex">
              {copy.openAdmin}
            </a>
            <a href="/signup"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25">
              {copy.createWorkspace}
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 via-white to-gray-50 py-14 dark:from-gray-950 dark:via-slate-950 dark:to-gray-950 sm:py-20">
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(16,185,129,0.07) 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        {/* Gradient blobs */}
        <div className="pointer-events-none absolute -top-32 end-0 -z-10 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl sm:h-[420px] sm:w-[420px]" />
        <div className="pointer-events-none absolute bottom-0 start-0 -z-10 h-64 w-64 rounded-full bg-teal-400/8 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:gap-16">

          {/* Left */}
          <div className="space-y-7">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {branding.site_name}
              </span>
              <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
                {copy.heroSubtitle}
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-3">
              <a href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30">
                {copy.createWorkspace}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-emerald-400 hover:text-emerald-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-emerald-600 dark:hover:text-emerald-400">
                {copy.openAdmin}
              </a>
            </div>

            {/* Search — glow + shimmer */}
            <form onSubmit={(e) => { e.preventDefault(); goToPublic(cleanSlug); }}
              className="search-glow overflow-hidden rounded-2xl border border-gray-200/90 bg-white/95 p-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/95">

              <div className="search-shimmer" />

              <label className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Search className="h-3.5 w-3.5" />
                {copy.searchLabel}
              </label>

              <div className="relative">
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 pe-12 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all duration-200
                    focus:border-emerald-400/70 focus:bg-white focus:shadow-[inset_0_0_0_3px_rgba(16,185,129,0.08)]
                    dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-emerald-600/70 dark:focus:bg-gray-800"
                  placeholder={copy.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" disabled={!cleanSlug}
                  className="absolute inset-y-1.5 end-1.5 inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg bg-emerald-600 px-2.5 text-white shadow-sm transition-all
                    hover:bg-emerald-500 hover:shadow-[0_0_14px_rgba(16,185,129,0.5)]
                    disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-2 text-[11px] text-gray-400">{copy.searchHint}</p>

              {(searchLoading || searchError || searchTerm.trim().length > 0) && (
                <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900">
                  {searchLoading ? (
                    <div className="flex items-center gap-2.5 px-4 py-3">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      <p className="text-xs text-gray-500">{copy.searchLoading}</p>
                    </div>
                  ) : searchError ? (
                    <p className="px-4 py-3 text-xs text-rose-500">{searchError}</p>
                  ) : suggestions.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-gray-500">{copy.searchEmpty}</p>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {suggestions.map((ws) => (
                        <li key={ws.slug}
                          className="group/item relative flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
                          <div className="absolute start-0 top-1/2 h-5 w-[3px] -translate-y-1/2 scale-y-0 rounded-e-full bg-emerald-500 transition-transform duration-200 group-hover/item:scale-y-100" />
                          <button type="button" onClick={() => goToPublic(ws.slug)} className="min-w-0 text-start">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{ws.name}</p>
                            <p className="truncate text-[11px] text-gray-400">/d/{ws.slug}</p>
                          </button>
                          <div className="flex shrink-0 gap-1.5">
                            <button type="button" onClick={() => goToPublic(ws.slug)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-gray-700 dark:text-gray-400">
                              {copy.viewDocs}
                            </button>
                            <button type="button" onClick={() => goToAdmin(ws.slug)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-500">
                              {copy.openAdmin}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right: preview panel */}
          <aside id="preview" className="overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-950 shadow-2xl ring-1 ring-white/[0.04]">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-gray-800 bg-gray-900/80 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              <span className="ms-2 flex-1 rounded-md bg-gray-800 px-2.5 py-0.5 font-mono text-[10px] text-gray-500">
                /d/workspace
              </span>
            </div>

            {/* Sidebar + content */}
            <div className="flex">
              <div className="hidden w-28 shrink-0 border-e border-gray-800 bg-gray-900/40 p-3 sm:block">
                {copy.previewSections.map((s) => (
                  <div key={s.title} className="mb-3">
                    <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">{s.title}</p>
                    {s.chips.slice(0, 2).map((chip) => (
                      <p key={chip} className="truncate rounded px-2 py-1 text-[10px] text-gray-500 transition hover:bg-gray-800 hover:text-gray-300">{chip}</p>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-4 text-white">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">{copy.previewTitle}</p>
                <p className="mb-4 text-[11px] text-gray-500">{copy.previewSubtitle}</p>
                <div className="space-y-2.5">
                  {copy.previewSections.map((item, i) => (
                    <div key={item.title} className="rounded-lg border border-gray-800/80 bg-gray-900/50 p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-emerald-700/80 text-[9px] font-bold">{i + 1}</span>
                        <span className="text-[11px] font-semibold text-gray-300">{item.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.chips.map((chip) => (
                          <span key={chip} className="rounded border border-gray-700/80 bg-gray-800/60 px-1.5 py-0.5 text-[10px] text-gray-400">{chip}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section id="how" className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{copy.howTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400 sm:text-base">{copy.howSubtitle}</p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {copy.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <article key={step} className="section-card group relative cursor-default">
                  <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent transition-all duration-300 group-hover:via-emerald-500/60" />
                  <span className="absolute end-5 top-4 text-3xl font-black text-gray-100 dark:text-gray-800/80">{i + 1}</span>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 shadow-sm dark:from-emerald-900/40 dark:to-teal-900/20 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{step}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{copy.stepDesc[i]}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Updates ─────────────────────────────────────────────────── */}
      <section id="updates" className="border-y border-gray-100 bg-gray-50/80 py-14 dark:border-gray-800/60 dark:bg-slate-900/30 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{copy.updatesTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400 sm:text-base">{copy.updatesSubtitle}</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {copy.updatesItems.map((item) => (
              <div key={item.text} className="item-card flex items-center gap-3 px-4 py-3.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[item.status]}`} />
                <p className="min-w-0 flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{item.text}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  item.status === "done"       ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : item.status === "progress" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {STATUS_LABEL[lang][item.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────── */}
      <section id="contact" className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-8 dark:border-emerald-900/30 dark:from-emerald-950/30 dark:to-teal-950/20">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{copy.contactTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">{copy.contactSubtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`mailto:${copy.contactEmail}`}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 hover:shadow-md">
                <Zap className="h-4 w-4" />
                {copy.contactEmail}
              </a>
              <a href="#how"
                className="rounded-xl border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-white dark:border-emerald-900/60 dark:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                {copy.contactFaq}
              </a>
              <a href="#updates"
                className="rounded-xl border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-white dark:border-emerald-900/60 dark:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                {copy.contactDocs}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 px-4 py-10 dark:border-gray-800/60 dark:bg-gray-950 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            {branding.site_logo ? (
              <img src={branding.site_logo} alt={branding.site_name} className="h-8 w-8 rounded-xl object-cover shadow-sm" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-sm">
                {branding.site_name[0]?.toUpperCase() ?? "D"}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{branding.site_name}</p>
              <p className="text-xs text-gray-400">{copy.footerTagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400 dark:text-gray-500">
            <a href="/signup"  className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.createWorkspace}</a>
            <a href="/login"   className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.openAdmin}</a>
            <a href="#how"     className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.navHow}</a>
            <a href="#contact" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.navContact}</a>
          </div>
          <p className="text-xs text-gray-300 dark:text-gray-700">© 2026 {branding.site_name}</p>
        </div>
      </footer>
    </main>
  );
}
