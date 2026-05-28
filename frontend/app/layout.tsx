import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import PwaRegister from "./PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Docs Platform",
  title: {
    default: "Docs Platform",
    template: "%s | Docs Platform",
  },
  description: "Multi-tenant documentation platform for public docs and private admin workflows.",
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
};

async function resolveDocumentLang() {
  const cookieLang = (await cookies()).get("NEXT_LOCALE")?.value;
  if (cookieLang === "tr" || cookieLang === "en" || cookieLang === "ar") return cookieLang;
  const accept = (await headers()).get("accept-language") || "";
  const langs = accept.split(",").map((item) => item.split(";")[0].trim().split("-")[0].toLowerCase());
  for (const lang of langs) {
    if (lang === "tr" || lang === "en" || lang === "ar") return lang;
  }
  return "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await resolveDocumentLang();
  const theme = (await cookies()).get("theme")?.value;
  const dark = theme === "dark";
  return (
    <html
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      translate="no"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={dark ? "dark" : undefined}
    >
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
