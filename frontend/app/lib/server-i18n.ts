import { headers, cookies } from "next/headers";

export type PublicLang = "tr" | "en" | "ar";

export const publicCopy = {
  tr: {
    documentation: "Dokümantasyon",
    admin: "Admin",
    publishedDocs: "Yayınlanan dokümanlar",
    searchDocumentation: "Dokümantasyonda ara",
    searchPlaceholder: "Kategori, başlık veya içerik ara",
    noPublishedDocs: "Henüz yayınlanmış dokümantasyon yok.",
    notFoundSection: "Dokümantasyon bölümü bulunamadı",
    notFoundPage: "Dokümantasyon sayfası bulunamadı",
    backToDocs: "Dokümanlara dön",
    search: "Ara",
    searchTitle: "Dokümantasyonda ara",
    searchMetaTitle: "Arama",
    typeTwoChars: "Arama için en az iki karakter yazın.",
    noResult: "Sonuç bulunamadı",
    workspaceDocs: "dokümantasyon alanı",
    allResults: "Tüm sonuçları gör",
  },
  en: {
    documentation: "Documentation",
    admin: "Admin",
    publishedDocs: "Published docs",
    searchDocumentation: "Search documentation",
    searchPlaceholder: "Search category, heading, or content",
    noPublishedDocs: "No published documentation yet.",
    notFoundSection: "Documentation section not found",
    notFoundPage: "Documentation page not found",
    backToDocs: "Back to docs",
    search: "Search",
    searchTitle: "Search documentation",
    searchMetaTitle: "Search",
    typeTwoChars: "Type at least two characters to search.",
    noResult: "No result found",
    workspaceDocs: "documentation workspace",
    allResults: "View all results",
  },
  ar: {
    documentation: "التوثيق",
    admin: "الإدارة",
    publishedDocs: "المستندات المنشورة",
    searchDocumentation: "البحث في التوثيق",
    searchPlaceholder: "ابحث في الفئات أو العناوين أو المحتوى",
    noPublishedDocs: "لا توجد مستندات منشورة بعد.",
    notFoundSection: "لم يتم العثور على قسم التوثيق",
    notFoundPage: "لم يتم العثور على صفحة التوثيق",
    backToDocs: "العودة إلى المستندات",
    search: "بحث",
    searchTitle: "البحث في التوثيق",
    searchMetaTitle: "بحث",
    typeTwoChars: "اكتب حرفين على الأقل للبحث.",
    noResult: "لم يتم العثور على نتائج",
    workspaceDocs: "مساحة التوثيق",
    allResults: "عرض جميع النتائج",
  },
};

export async function resolvePublicLang(): Promise<PublicLang> {
  const cookieLang = (await cookies()).get("NEXT_LOCALE")?.value;
  if (cookieLang === "tr" || cookieLang === "en" || cookieLang === "ar") return cookieLang;

  const accept = (await headers()).get("accept-language") || "";
  const langs = accept.split(",").map((l) => l.split(";")[0].trim().split("-")[0].toLowerCase());
  for (const lang of langs) {
    if (lang === "ar") return "ar";
    if (lang === "tr") return "tr";
    if (lang === "en") return "en";
  }
  return "en";
}

