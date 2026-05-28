"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import "../../src/i18n";
import { PlatformAuthApi } from "../../src/shared/api/auth";
import LanguageSwitcher from "../../src/shared/components/LanguageSwitcher";
import { slugify } from "../../src/shared/utils/slug";

export default function SignupApp() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tenant_slug: string;
    verification_link: string;
    dev_verification_token?: string | null;
  } | null>(null);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Canlı doğrulama polling: kayıt sonrası her 3 saniyede bir kontrol et
  useEffect(() => {
    if (!result?.tenant_slug) return;
    if (verified) return;

    let attempts = 0;
    const MAX_ATTEMPTS = 200; // 10 dakika (200 × 3s)

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/verification-status?tenant_slug=${encodeURIComponent(result.tenant_slug)}`,
          { headers: { Accept: "application/json" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.verified) {
            setVerified(true);
            clearInterval(pollRef.current!);
          }
        }
      } catch {
        // sessizce yoksay
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [result?.tenant_slug, verified]);

  const effectiveSlug = useMemo(
    () => slugify(tenantSlug || workspaceName),
    [tenantSlug, workspaceName]
  );

  if (!mounted) {
    return (
      <main className="login-stage flex min-h-screen items-center justify-center px-4 py-8">
        <section className="login-card w-full max-w-xl rounded-[1.35rem] p-6 shadow-2xl sm:p-8 md:p-10" />
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await PlatformAuthApi.signup({
        email,
        password,
        workspace_name: workspaceName,
        tenant_slug: effectiveSlug,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || t("signup_failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-stage flex min-h-screen items-center justify-center px-4 py-8">
      <section className="login-card w-full max-w-xl rounded-[1.35rem] p-6 shadow-2xl sm:p-8 md:p-10">

        {/* Top bar: language switcher */}
        <div className="mb-8 flex justify-end">
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("signup_title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
          {t("signup_public_url")}{" "}
          <span dir="ltr" className="inline-block font-semibold text-emerald-600 dark:text-emerald-400">
            /d/{effectiveSlug || "workspace"}
          </span>
        </p>

        {result ? (
          <div className="mt-9 space-y-4">
            {verified ? (
              /* ✅ E-posta doğrulandı */
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center animate-[modalIn_.3s_ease-out] dark:border-emerald-400/40 dark:bg-emerald-500/15">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {t("verified_login_now")}
                </p>
                <a
                  href={`/login?workspace=${encodeURIComponent(result.tenant_slug)}`}
                  className="mt-5 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-500"
                >
                  {t("go_to_login")}
                </a>
              </div>
            ) : (
              /* ⏳ Bekleniyor */
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {t("verification_email_sent")}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {t("verification_email_desc")}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t("awaiting_verification")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dev modu: doğrulama linki */}
            {result.dev_verification_token && !verified && (
              <a
                className="login-primary block min-h-14 w-full rounded-2xl px-4 py-4 text-center text-base font-semibold text-white"
                href={`/verify-email?token=${encodeURIComponent(result.dev_verification_token)}`}
              >
                {t("verify_locally")}
              </a>
            )}

            <a
              className="mt-4 block text-center text-sm font-medium text-gray-500 transition hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
              href="/"
            >
              {t("back_home")}
            </a>
          </div>
        ) : (
          <form className="mt-9 space-y-4" onSubmit={submit}>
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base outline-none placeholder:text-gray-400"
              placeholder={t("workspace_name")}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base outline-none placeholder:text-gray-400"
              placeholder={t("workspace_slug")}
              value={tenantSlug || effectiveSlug}
              onChange={(e) => setTenantSlug(slugify(e.target.value))}
              required
              dir="ltr"
              maxLength={63}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base outline-none placeholder:text-gray-400"
              placeholder={t("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input
                className="login-input min-h-14 w-full rounded-2xl px-5 pr-14 text-base outline-none placeholder:text-gray-400"
                placeholder={t("password")}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-emerald-500 dark:hover:text-emerald-400"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              disabled={loading || !effectiveSlug}
              className="login-primary min-h-14 w-full rounded-2xl px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("creating_workspace") : t("create_workspace")}
            </button>
          </form>
        )}

        <a
          className="mt-8 block text-center text-sm font-medium text-gray-500 transition hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
          href="/"
        >
          {t("back_home")}
        </a>
      </section>
    </main>
  );
}
