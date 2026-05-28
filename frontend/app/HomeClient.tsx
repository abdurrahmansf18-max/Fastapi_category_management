"use client";
import {
  ArrowRight, BookOpen, Cake, ChevronDown, Copy, Check,
  Github, Globe, GraduationCap, Mail, MapPin, Moon, PenLine, Phone,
  Search, Send, Share2, Sun, Users, Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "../src/i18n";
import LanguageSwitcher from "../src/shared/components/LanguageSwitcher";

type WorkspaceSuggestion = { slug: string; name: string };

type HomeCopy = {
  navHow: string;
  navPreview: string;
  navAbout: string;
  navContact: string;
  navDev: string;
  heroTitle: string;
  heroSubtitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  searchLoading: string;
  searchEmpty: string;
  searchError: string;
  viewDocs: string;
  copyLink: string;
  copied: string;
  openAdmin: string;
  createWorkspace: string;
  noWorkspace: string;
  howTitle: string;
  howSubtitle: string;
  guideSteps: Array<{ title: string; desc: string; detail: string }>;
  previewTitle: string;
  previewSubtitle: string;
  previewSections: Array<{ title: string; chips: string[] }>;
  aboutTitle: string;
  aboutSubtitle: string;
  aboutCards: Array<{ title: string; text: string }>;
  statsTitle: string;
  statsUsers: string;
  statsSessions: string;
  contactTitle: string;
  contactSubtitle: string;
  contactEmail: string;
  contactFaq: string;
  contactDocs: string;
  contactFormNameLabel: string;
  contactFormEmailLabel: string;
  contactFormMessageLabel: string;
  contactFormNamePlaceholder: string;
  contactFormEmailPlaceholder: string;
  contactFormMessagePlaceholder: string;
  contactFormSubmit: string;
  contactFormSending: string;
  contactFormSuccess: string;
  contactFormError: string;
  devTitle: string;
  devName: string;
  devRole: string;
  devEdu: string;
  devBio: string;
  devLocation: string;
  devAge: string;
  devEmailLabel: string;
  devPhoneLabel: string;
  devGithubLabel: string;
  footerTagline: string;
};

const HOME_COPY: Record<"tr" | "en" | "ar", HomeCopy> = {
  tr: {
    navHow: "Nasıl Çalışır",
    navPreview: "Önizleme",
    navAbout: "Platform",
    navContact: "İletişim",
    navDev: "Geliştirici",
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
    copyLink: "Linki Kopyala",
    copied: "Kopyalandı!",
    openAdmin: "Giriş Yap",
    createWorkspace: "Ücretsiz Başla",
    noWorkspace: "Henüz workspace yok mu?",
    howTitle: "Tam Çalışma Rehberi",
    howSubtitle: "İlk workspace'ten yayın sonrası bakıma kadar akış açık ve sırayla ilerler.",
    guideSteps: [
      {
        title: "Workspace Oluştur",
        desc: "Kayıt ol, çalışma alanı adını ve public slug'ını belirle.",
        detail: "Slug public adresindir; daha sonra insanlar seni bu adres ve arama ile bulur.",
      },
      {
        title: "E-postanı Doğrula ve Giriş Yap",
        desc: "Doğrulama sonrası merkezi giriş ekranından workspace'ini seç.",
        detail: "Admin paneline URL ezberlemeden güvenli şekilde geçersin.",
      },
      {
        title: "Doküman Yapısını Kur",
        desc: "Kategori, ana başlık, alt başlık ve içerik sırasını düzenle.",
        detail: "Büyük dokümanlar da bu yapı sayesinde mobilde ve masaüstünde okunur kalır.",
      },
      {
        title: "SEO ve Yayını Kontrol Et",
        desc: "Açıklama, başlık, görsel, dosya eki ve public önizlemeyi gözden geçir.",
        detail: "Yayınlanan içerik public sayfaya ve arama görünürlüğüne hazırlanır.",
      },
      {
        title: "Paylaş ve Güncel Tut",
        desc: "Public linkini paylaş, geri bildirimi izle, kırık bağlantıları temizle.",
        detail: "İçeriği büyütürken okuyucunun arama ve gezinme deneyimi bozulmaz.",
      },
    ],
    previewTitle: "Public Sayfa Önizleme",
    previewSubtitle: "Tenant public sayfaları bu yapıda görünür.",
    previewSections: [
      { title: "Kurulum", chips: ["Gereksinimler", "Docker", "Ortam Değişkenleri"] },
      { title: "Hızlı Başlangıç", chips: ["İlk İstek", "Kimlik Doğrulama"] },
      { title: "Temel Kavramlar", chips: ["API Yapısı", "Kategori Akışı"] },
    ],
    aboutTitle: "Bu Platform Ne İşe Yarar?",
    aboutSubtitle: "Bilgiyi dağınık dosyalardan çıkarıp okunabilir, aranabilir ve paylaşılabilir bir public alana taşır.",
    aboutCards: [
      {
        title: "Kendi Bilgi Merkezin",
        text: "Yazılım notu, hukuk rehberi, haber arşivi veya eğitim dokümanı için düzenli bir yayın alanı kurarsın.",
      },
      {
        title: "Okuyucu İçin Rahat",
        text: "Kategori gezintisi, hızlı arama ve responsive public sayfalar içeriği telefonda da rahat okunur tutar.",
      },
      {
        title: "Yönetmesi Kolay",
        text: "Admin panelinden içerik düzenler, SEO açıklamalarını güçlendirir ve yayın akışını tek yerden yönetirsin.",
      },
    ],
    statsTitle: "Topluluk",
    statsUsers: "Kayıtlı Kullanıcı",
    statsSessions: "Aktif Oturum",
    contactTitle: "İletişim",
    contactSubtitle: "Soru, öneri veya sorunlarınız için formu doldurun; size ulaşalım.",
    contactEmail: "destek@docspace.example",
    contactFaq: "Nasıl Çalışır",
    contactDocs: "Kullanım Rehberi",
    contactFormNameLabel: "Adınız (opsiyonel)",
    contactFormEmailLabel: "E-posta (opsiyonel)",
    contactFormMessageLabel: "Mesajınız",
    contactFormNamePlaceholder: "Adınız",
    contactFormEmailPlaceholder: "ornek@eposta.com",
    contactFormMessagePlaceholder: "Sorunuzu veya önerinizi buraya yazın…",
    contactFormSubmit: "Gönder",
    contactFormSending: "Gönderiliyor…",
    contactFormSuccess: "Mesajınız iletildi! En kısa sürede geri döneceğiz.",
    contactFormError: "Mesaj gönderilemedi. Lütfen tekrar deneyin.",
    devTitle: "Geliştirici Hakkında",
    devName: "Abdurrahman el Savvaf",
    devRole: "Full-Stack Web Geliştirici",
    devEdu: "Yazılım Mühendisliği — 4. Yıl (Devam ediyor)",
    devBio: "Suriyeli, Ankara'da ikamet ediyorum. Ostim Teknik Üniversitesi'nde Yazılım Mühendisliği okuyorum; 3. sınıfı tamamladım, 4. sınıfa geçtim. Full-stack web geliştirme alanında aktif olarak çalışıyor ve projeler üretiyorum.",
    devLocation: "Ankara, Türkiye",
    devAge: "23 yaşında",
    devEmailLabel: "Üniversite E-postası",
    devPhoneLabel: "Telefon",
    devGithubLabel: "GitHub Profilim",
    footerTagline: "Dokümantasyonunu hızlı ve kolay yayınla.",
  },
  en: {
    navHow: "How It Works",
    navPreview: "Preview",
    navAbout: "About",
    navContact: "Contact",
    navDev: "Developer",
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
    copyLink: "Copy Link",
    copied: "Copied!",
    openAdmin: "Login",
    createWorkspace: "Get Started Free",
    noWorkspace: "No workspace yet?",
    howTitle: "Complete Workflow Guide",
    howSubtitle: "From the first workspace to published maintenance, the path stays clear.",
    guideSteps: [
      {
        title: "Create a Workspace",
        desc: "Sign up, choose the workspace name, and reserve its public slug.",
        detail: "The slug becomes the public address people can open and search for.",
      },
      {
        title: "Verify and Sign In",
        desc: "Verify your email, then select your workspace from the central login flow.",
        detail: "You reach the admin safely without memorizing a hidden URL.",
      },
      {
        title: "Build the Structure",
        desc: "Organize categories, top-level headings, sub-pages, and content.",
        detail: "The same structure stays readable as documentation grows across screen sizes.",
      },
      {
        title: "Review SEO and Publish",
        desc: "Check descriptions, media, attachments, and the public preview before publishing.",
        detail: "Published pages are prepared for readers, search, and direct sharing.",
      },
      {
        title: "Share and Maintain",
        desc: "Share the public link, watch feedback, and keep links and content fresh.",
        detail: "Readers keep a clean search and navigation experience as the library grows.",
      },
    ],
    previewTitle: "Public Page Preview",
    previewSubtitle: "Tenant public pages look like this.",
    previewSections: [
      { title: "Setup", chips: ["Requirements", "Docker", "Environment Variables"] },
      { title: "Quick Start", chips: ["First Request", "Authentication"] },
      { title: "Core Concepts", chips: ["API Structure", "Category Flow"] },
    ],
    aboutTitle: "What Is This Platform For?",
    aboutSubtitle: "It turns scattered knowledge into a readable, searchable, and shareable public documentation space.",
    aboutCards: [
      {
        title: "Your Knowledge Hub",
        text: "Publish software notes, legal guides, news archives, training material, or any living documentation set.",
      },
      {
        title: "Reader Friendly",
        text: "Category navigation, quick search, and responsive public pages keep content comfortable on phones too.",
      },
      {
        title: "Simple to Operate",
        text: "Manage content, strengthen SEO descriptions, and control publishing from one admin workspace.",
      },
    ],
    statsTitle: "Community",
    statsUsers: "Registered Users",
    statsSessions: "Active Sessions",
    contactTitle: "Contact",
    contactSubtitle: "Fill out the form for questions, suggestions, or issues and we'll get back to you.",
    contactEmail: "support@docspace.example",
    contactFaq: "How It Works",
    contactDocs: "Usage Guide",
    contactFormNameLabel: "Your name (optional)",
    contactFormEmailLabel: "Email (optional)",
    contactFormMessageLabel: "Message",
    contactFormNamePlaceholder: "Your name",
    contactFormEmailPlaceholder: "you@example.com",
    contactFormMessagePlaceholder: "Write your question or suggestion here…",
    contactFormSubmit: "Send",
    contactFormSending: "Sending…",
    contactFormSuccess: "Message sent! We'll get back to you soon.",
    contactFormError: "Failed to send. Please try again.",
    devTitle: "About the Developer",
    devName: "Abdurrahman el Savvaf",
    devRole: "Full-Stack Web Developer",
    devEdu: "Software Engineering — 4th Year (In Progress)",
    devBio: "Syrian, based in Ankara, Turkey. Studying Software Engineering at Ostim Technical University — completed 3rd year, now entering 4th year. Actively building full-stack web projects and growing as a developer.",
    devLocation: "Ankara, Turkey",
    devAge: "23 years old",
    devEmailLabel: "University Email",
    devPhoneLabel: "Phone",
    devGithubLabel: "GitHub Profile",
    footerTagline: "Publish your documentation fast and easy.",
  },
  ar: {
    navHow: "كيف يعمل",
    navPreview: "معاينة",
    navAbout: "عن المنصة",
    navContact: "التواصل",
    navDev: "المطوّر",
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
    copyLink: "نسخ الرابط",
    copied: "تم النسخ!",
    openAdmin: "تسجيل الدخول",
    createWorkspace: "ابدأ مجاناً",
    noWorkspace: "لا تملك مساحة عمل بعد؟",
    howTitle: "دليل العمل الكامل",
    howSubtitle: "من أول مساحة عمل إلى الصيانة بعد النشر بخطوات واضحة.",
    guideSteps: [
      {
        title: "أنشئ مساحة عمل",
        desc: "سجّل وحدد اسم مساحة العمل والمعرف العام الخاص بها.",
        detail: "المعرف يصبح الرابط العام الذي يفتحه القراء ويبحثون عنه.",
      },
      {
        title: "تحقق وسجّل الدخول",
        desc: "تحقق من بريدك ثم اختر مساحة العمل من مسار الدخول المركزي.",
        detail: "تصل إلى لوحة الإدارة بأمان من دون حفظ رابط خاص.",
      },
      {
        title: "ابن هيكل التوثيق",
        desc: "رتب الفئات والعناوين الرئيسية والصفحات الفرعية والمحتوى.",
        detail: "يبقى التصفح واضحاً حتى عندما يكبر المحتوى على كل الشاشات.",
      },
      {
        title: "راجع SEO وانشر",
        desc: "راجع الوصف والوسائط والمرفقات والمعاينة العامة قبل النشر.",
        detail: "تصبح الصفحات المنشورة جاهزة للقراء والبحث والمشاركة.",
      },
      {
        title: "شارك وحدث",
        desc: "شارك الرابط العام وراقب الملاحظات وحافظ على الروابط والمحتوى.",
        detail: "تبقى تجربة البحث والتنقل نظيفة مع نمو المكتبة.",
      },
    ],
    previewTitle: "معاينة الصفحة العامة",
    previewSubtitle: "صفحات التوثيق العامة تبدو هكذا.",
    previewSections: [
      { title: "الإعداد", chips: ["المتطلبات", "Docker", "متغيرات البيئة"] },
      { title: "البدء السريع", chips: ["الطلب الأول", "التحقق من الهوية"] },
      { title: "المفاهيم الأساسية", chips: ["بنية API", "تدفق الفئات"] },
    ],
    aboutTitle: "ما فائدة هذه المنصة؟",
    aboutSubtitle: "تنقل المعرفة من ملفات متفرقة إلى مساحة توثيق عامة قابلة للقراءة والبحث والمشاركة.",
    aboutCards: [
      {
        title: "مركز معرفتك",
        text: "انشر ملاحظات برمجية أو أدلة قانونية أو أرشيفاً صحفياً أو مواد تدريبية أو أي توثيق حي.",
      },
      {
        title: "مريحة للقارئ",
        text: "التنقل حسب الفئات والبحث السريع والصفحات المتجاوبة تجعل القراءة جيدة على الهاتف أيضاً.",
      },
      {
        title: "سهلة الإدارة",
        text: "أدر المحتوى وحسن أوصاف SEO وتحكم في النشر من مساحة إدارة واحدة.",
      },
    ],
    statsTitle: "المجتمع",
    statsUsers: "مستخدم مسجّل",
    statsSessions: "جلسة نشطة",
    contactTitle: "التواصل",
    contactSubtitle: "أرسل لنا سؤالاً أو اقتراحاً عبر النموذج وسنرد عليك في أقرب وقت.",
    contactEmail: "support@docspace.example",
    contactFaq: "كيف يعمل",
    contactDocs: "دليل الاستخدام",
    contactFormNameLabel: "اسمك (اختياري)",
    contactFormEmailLabel: "البريد الإلكتروني (اختياري)",
    contactFormMessageLabel: "رسالتك",
    contactFormNamePlaceholder: "اسمك",
    contactFormEmailPlaceholder: "you@example.com",
    contactFormMessagePlaceholder: "اكتب سؤالك أو اقتراحك هنا…",
    contactFormSubmit: "إرسال",
    contactFormSending: "جارٍ الإرسال…",
    contactFormSuccess: "تم إرسال رسالتك! سنرد عليك قريباً.",
    contactFormError: "فشل الإرسال. يرجى المحاولة مرة أخرى.",
    devTitle: "عن المطوّر",
    devName: "عبد الرحمن الصوّاف",
    devRole: "مطوّر ويب متكامل",
    devEdu: "هندسة البرمجيات — السنة الرابعة (جارٍ)",
    devBio: "سوري، أقيم في أنقرة، تركيا. أدرس هندسة البرمجيات في جامعة أوستيم التقنية؛ أنهيت السنة الثالثة وانتقلت للرابعة. أعمل على تطوير مشاريع ويب متكاملة وأسعى لتطوير نفسي باستمرار.",
    devLocation: "أنقرة، تركيا",
    devAge: "٢٣ عاماً",
    devEmailLabel: "البريد الجامعي",
    devPhoneLabel: "الهاتف",
    devGithubLabel: "ملف GitHub",
    footerTagline: "انشر توثيقك بسرعة وسهولة.",
  },
};

const STEP_ICONS = [BookOpen, PenLine, Globe, Search, Zap] as const;

// Threshold: show real stats when >= these values
const STATS_REAL_THRESHOLD_USERS = 100;
const STATS_REAL_THRESHOLD_SESSIONS = 50;
// Fallback display numbers (shown before threshold is reached)
const FAKE_USERS = 248;
const FAKE_SESSIONS = 37;

function normalizeSlug(value: string) {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9-\s]/g, "").replace(/\s+/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function useStats() {
  const [stats, setStats] = useState<{ registered_users: number; active_sessions: number } | null>(null);
  useEffect(() => {
    fetch("/api/platform/public-stats", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);
  const showRealUsers = (stats?.registered_users ?? 0) >= STATS_REAL_THRESHOLD_USERS;
  const showRealSessions = (stats?.active_sessions ?? 0) >= STATS_REAL_THRESHOLD_SESSIONS;
  return {
    displayUsers: showRealUsers ? (stats?.registered_users ?? FAKE_USERS) : FAKE_USERS,
    displaySessions: showRealSessions ? (stats?.active_sessions ?? FAKE_SESSIONS) : FAKE_SESSIONS,
    isReal: showRealUsers || showRealSessions,
  };
}

function useCopyLink() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 1400);
    }).catch(() => {});
  };
  return { copied, copy };
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

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState("");

  // Mobile accordion state for "How It Works"
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const stats = useStats();
  const { copied, copy: copyToClipboard } = useCopyLink();

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

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="home-shell min-h-screen text-gray-900 dark:bg-gray-950 dark:text-gray-50">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-emerald-900/30 bg-emerald-950/95 shadow-sm backdrop-blur-md dark:border-emerald-900/60 dark:bg-gray-950/95">
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
            {([["#how", copy.navHow], ["#preview", copy.navPreview], ["#about", copy.navAbout], ["#developer", copy.navDev], ["#contact", copy.navContact]] as [string, string][])
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

      {/* ── Stats Band ──────────────────────────────────────────────── */}
      <div className="border-b border-emerald-900/20 bg-emerald-950/80 dark:border-emerald-900/40 dark:bg-gray-900/60">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 py-2.5 sm:gap-16 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 shrink-0 text-emerald-400" />
            <div className="text-center">
              <span className="block text-lg font-black tabular-nums leading-none text-white">
                {stats.displayUsers.toLocaleString()}+
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-300/80">
                {copy.statsUsers}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-emerald-800/60" />
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <div className="text-center">
              <span className="block text-lg font-black tabular-nums leading-none text-white">
                {stats.displaySessions.toLocaleString()}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-300/80">
                {copy.statsSessions}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-300/70 bg-gradient-to-b from-slate-200/80 via-slate-100/80 to-slate-200/45 py-14 dark:border-gray-800/60 dark:from-gray-950 dark:via-slate-950 dark:to-gray-950 sm:py-20">
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(16,185,129,0.07) 1px, transparent 0)", backgroundSize: "28px 28px" }} />

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
                      {suggestions.map((ws) => {
                        const wsUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/d/${ws.slug}`;
                        const isCopied = copied === wsUrl;
                        return (
                          <li key={ws.slug} className="group/item relative flex items-center gap-0">
                            {/* Active indicator */}
                            <div className="absolute start-0 top-1/2 h-5 w-[3px] -translate-y-1/2 scale-y-0 rounded-e-full bg-emerald-500 transition-transform duration-200 group-hover/item:scale-y-100" />
                            <button
                              type="button"
                              onClick={() => goToPublic(ws.slug)}
                              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{ws.name}</p>
                                <p className="truncate text-[11px] text-gray-400">/d/{ws.slug}</p>
                              </div>
                              <span className="shrink-0 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_8px_rgba(16,185,129,0.45)] transition-all duration-200 group-hover/item:bg-emerald-600 group-hover/item:shadow-[0_0_18px_rgba(16,185,129,0.7)]">
                                {copy.viewDocs}
                              </span>
                            </button>
                            {/* Copy link button */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(wsUrl); }}
                              title={isCopied ? copy.copied : copy.copyLink}
                              className="flex h-full shrink-0 items-center justify-center border-s border-gray-100 px-3 py-3 text-gray-400 transition-colors hover:bg-gray-50 hover:text-emerald-600 dark:border-gray-800 dark:hover:bg-gray-800/60 dark:hover:text-emerald-400"
                            >
                              {isCopied
                                ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                                : <Copy className="h-3.5 w-3.5" />
                              }
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right: preview panel */}
          <aside id="preview" className="home-preview overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-950 shadow-2xl ring-1 ring-white/[0.04]">
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
                <div className="mb-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400">{copy.previewTitle}</p>
                  <p className="text-[11px] leading-5 text-slate-300">{copy.previewSubtitle}</p>
                </div>
                <div className="space-y-2.5">
                  {copy.previewSections.map((item, i) => (
                    <div key={item.title} className="home-preview-row rounded-lg border border-gray-800/80 bg-gray-900/50 p-3">
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

          {/* Desktop: grid, Mobile: accordion */}
          <div className="mt-10 hidden gap-5 lg:grid lg:grid-cols-2">
            {copy.guideSteps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <article key={step.title} className="section-card group relative cursor-default">
                  <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent transition-all duration-300 group-hover:via-emerald-500/60" />
                  <span className="absolute end-5 top-4 text-3xl font-black text-gray-100 dark:text-gray-800/80">{i + 1}</span>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 shadow-sm dark:from-emerald-900/40 dark:to-teal-900/20 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{step.desc}</p>
                  <p className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-xs leading-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300">
                    {step.detail}
                  </p>
                </article>
              );
            })}
          </div>

          {/* Mobile accordion */}
          <div className="mt-8 space-y-2 lg:hidden">
            {copy.guideSteps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              const isOpen = expandedStep === i;
              return (
                <div key={step.title} className="overflow-hidden rounded-xl border border-gray-200/80 bg-white dark:border-gray-800/80 dark:bg-gray-900/60">
                  <button
                    type="button"
                    onClick={() => setExpandedStep(isOpen ? null : i)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-start"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</p>
                      {!isOpen && (
                        <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{step.desc}</p>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{step.desc}</p>
                      <p className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-2 text-xs leading-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300">
                        {step.detail}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────── */}
      <section id="about" className="home-muted-band border-y border-slate-300/70 py-14 dark:border-gray-800/60 dark:bg-slate-900/30 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{copy.aboutTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-400 sm:text-base">{copy.aboutSubtitle}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.aboutCards.map((item, index) => (
              <article key={item.title} className="section-card group relative min-h-40">
                <span className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-500/20">
                  {index + 1}
                </span>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Developer + Contact ─────────────────────────────────────── */}
      <section id="contact" className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2">

            {/* ── Developer Card ─── */}
            <div id="developer" className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800/60 dark:bg-gray-900/60">
              {/* Header banner */}
              <div className="relative border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 dark:border-gray-800 dark:from-emerald-700 dark:to-teal-700">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">{copy.devTitle}</p>
              </div>

              <div className="p-6 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="mx-auto h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-emerald-300/70 bg-slate-100 shadow-md ring-4 ring-emerald-500/10 dark:border-emerald-800 dark:bg-slate-900 sm:mx-0">
                    <img
                      src="/abdurrahman-profile.jpg"
                      alt="Abdurrahman el Savvaf"
                      className="h-full w-full object-cover object-[50%_18%]"
                      loading="eager"
                      decoding="async"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-center text-xl font-bold text-gray-900 dark:text-white sm:text-left">{copy.devName}</h3>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{copy.devRole}</p>

                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/50">
                        <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                        Ostim Teknik Üniversitesi
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                        {copy.devLocation}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                        <Cake className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                        {copy.devAge}
                      </span>
                    </div>

                    <p className="mt-4 flex items-start gap-2 text-sm font-medium leading-6 text-gray-600 dark:text-gray-300">
                      <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{copy.devEdu}</span>
                    </p>
                  </div>
                </div>

                <p className="mt-5 border-l-2 border-emerald-400/70 pl-4 text-sm leading-7 text-gray-600 dark:text-gray-400">{copy.devBio}</p>

                <div className="mt-6 grid gap-2.5">
                  <a href="mailto:230205907@ostimteknik.edu.tr"
                    className="grid gap-1 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-2.5">
                    <Mail className="hidden h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 sm:block" />
                    <span className="min-w-0 truncate">{copy.devEmailLabel}</span>
                    <span className="min-w-0 truncate text-xs text-gray-400 dir-ltr">230205907@ostimteknik.edu.tr</span>
                  </a>
                  <a href="tel:+905397389476"
                    className="grid gap-1 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-2.5">
                    <Phone className="hidden h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400 sm:block" />
                    <span className="min-w-0 truncate">{copy.devPhoneLabel}</span>
                    <span className="min-w-0 truncate text-xs text-gray-400 dir-ltr">0539 738 94 76</span>
                  </a>
                  <a href="https://github.com/abdurrahmansf18-max" target="_blank" rel="noopener noreferrer"
                    className="grid gap-1 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-2.5">
                    <Github className="hidden h-4 w-4 shrink-0 sm:block" />
                    <span className="min-w-0 truncate">{copy.devGithubLabel}</span>
                    <span className="min-w-0 truncate text-xs text-gray-400">@abdurrahmansf18-max</span>
                  </a>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {["Python", "FastAPI", "Next.js", "TypeScript", "PostgreSQL", "Redis", "Docker"].map((tech) => (
                    <span key={tech} className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Contact Form ─── */}
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 dark:border-emerald-900/30 dark:from-emerald-950/30 dark:to-teal-950/20">
              <div className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{copy.contactTitle}</h2>
                <p className="mt-1.5 max-w-md text-sm text-gray-600 dark:text-gray-400">{copy.contactSubtitle}</p>

                {contactDone ? (
                  <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Zap className="h-4 w-4 shrink-0" />
                    {copy.contactFormSuccess}
                  </div>
                ) : (
                  <form
                    className="mt-6 grid gap-4 sm:grid-cols-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!contactMessage.trim()) return;
                      setContactSending(true);
                      setContactError("");
                      try {
                        const res = await fetch("/api/platform/contact", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: contactName.trim(),
                            email: contactEmail.trim(),
                            message: contactMessage.trim(),
                          }),
                        });
                        if (!res.ok) throw new Error();
                        setContactDone(true);
                        setContactName("");
                        setContactEmail("");
                        setContactMessage("");
                      } catch {
                        setContactError(copy.contactFormError);
                      } finally {
                        setContactSending(false);
                      }
                    }}
                  >
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {copy.contactFormNameLabel}
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={copy.contactFormNamePlaceholder}
                        maxLength={120}
                        className="w-full rounded-xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {copy.contactFormEmailLabel}
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder={copy.contactFormEmailPlaceholder}
                        maxLength={320}
                        className="w-full rounded-xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {copy.contactFormMessageLabel}
                        <span className="ms-1 text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder={copy.contactFormMessagePlaceholder}
                        maxLength={5000}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                      />
                    </div>

                    {contactError && (
                      <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{contactError}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                      <button
                        type="submit"
                        disabled={contactSending || !contactMessage.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="h-4 w-4" />
                        {contactSending ? copy.contactFormSending : copy.contactFormSubmit}
                      </button>
                      <a href="#how"
                        className="rounded-xl border border-emerald-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-white dark:border-emerald-900/60 dark:bg-transparent dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                        {copy.contactFaq}
                      </a>
                    </div>
                  </form>
                )}
              </div>
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
            <a href="/signup"    className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.createWorkspace}</a>
            <a href="/login"     className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.openAdmin}</a>
            <a href="#how"       className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.navHow}</a>
            <a href="#developer" className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.navDev}</a>
            <a href="#contact"   className="transition hover:text-emerald-600 dark:hover:text-emerald-400">{copy.navContact}</a>
          </div>
          <p className="text-xs text-gray-300 dark:text-gray-700">© 2026 {branding.site_name}</p>
        </div>
      </footer>
    </main>
  );
}
