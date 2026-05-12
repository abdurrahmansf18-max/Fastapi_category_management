"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "../src/i18n";
import LanguageSwitcher from "../src/shared/components/LanguageSwitcher";

export default function Home() {
  const { t } = useTranslation();
  const [slug, setSlug] = useState("");

  const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");

  function goToPublicSite(e: React.FormEvent) {
    e.preventDefault();
    if (cleanSlug) window.location.href = `/d/${cleanSlug}`;
  }

  return (
    <main className="bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-emerald-400">DocSpace</span>
          <nav className="hidden gap-6 text-sm text-gray-400 sm:flex">
            <a href="#features" className="transition-colors hover:text-white">
              {t("landing_features_title")}
            </a>
            <a href="#how" className="transition-colors hover:text-white">
              {t("landing_how_title")}
            </a>
            <a href="#login" className="transition-colors hover:text-white">
              {t("landing_login_title")}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a
              href="/signup"
              className="hidden rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-emerald-500 sm:block"
            >
              {t("create_workspace")}
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex min-h-[90vh] flex-col items-center justify-center px-4 text-center">
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          {t("landing_hero_badge")}
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          {t("landing_hero_title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-gray-400 sm:text-lg">
          {t("landing_hero_subtitle")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/signup"
            className="rounded-xl bg-emerald-600 px-7 py-3 font-semibold transition-colors hover:bg-emerald-500"
          >
            {t("create_workspace")}
          </a>
          <a
            href="#features"
            className="rounded-xl border border-white/15 px-7 py-3 font-semibold transition-colors hover:bg-white/10"
          >
            {t("landing_explore_features")}
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold">{t("landing_features_title")}</h2>
          <p className="mt-4 text-center text-gray-400">{t("landing_features_subtitle")}</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {([1, 2, 3, 4, 5, 6] as const).map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-white/10 bg-gray-900 p-6 transition-colors hover:border-emerald-500/30"
              >
                <h3 className="font-semibold text-emerald-300">{t(`feat${n}_title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{t(`feat${n}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white/[0.02] px-4 py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold">{t("landing_how_title")}</h2>
          <p className="mt-4 text-center text-gray-400">{t("landing_how_subtitle")}</p>
          <ol className="mt-12 space-y-8">
            {([1, 2, 3] as const).map((n) => (
              <li key={n} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold">
                  {n}
                </div>
                <div>
                  <h3 className="font-semibold">{t(`landing_step${n}_title`)}</h3>
                  <p className="mt-1 text-sm text-gray-400">{t(`landing_step${n}_desc`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <a
              href="/signup"
              className="inline-block rounded-xl bg-emerald-600 px-8 py-3 font-semibold transition-colors hover:bg-emerald-500"
            >
              {t("create_workspace")}
            </a>
          </div>
        </div>
      </section>

      {/* Login / access existing workspace */}
      <section id="login" className="px-4 py-24">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-3xl font-bold">{t("landing_login_title")}</h2>
          <p className="mt-4 text-gray-400">{t("landing_login_subtitle")}</p>
          <form onSubmit={goToPublicSite} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none placeholder:text-gray-500 focus:border-emerald-400"
              placeholder={t("landing_slug_placeholder")}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-xl bg-emerald-600 px-6 py-3 font-semibold transition-colors hover:bg-emerald-500"
            >
              {t("landing_view_docs")}
            </button>
          </form>
          {cleanSlug && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500">
                {t("landing_url_hint")}{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-emerald-300">
                  /d/{cleanSlug}
                </code>
              </p>
              <a
                href={`/d/${cleanSlug}/admin`}
                className="inline-block text-sm text-gray-400 transition-colors hover:text-emerald-400"
              >
                {t("landing_go_admin")}
              </a>
            </div>
          )}
          <p className="mt-6 text-sm text-gray-500">
            {t("landing_no_workspace")}{" "}
            <a href="/signup" className="text-emerald-400 hover:underline">
              {t("landing_create_cta")}
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-gray-600">
        {t("landing_copyright")}
      </footer>
    </main>
  );
}
