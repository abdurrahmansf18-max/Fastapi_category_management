"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import "../../src/i18n";
import { PlatformAuthApi } from "../../src/shared/api/auth";
import LanguageSwitcher from "../../src/shared/components/LanguageSwitcher";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

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

  useEffect(() => { setMounted(true); }, []);

  const effectiveSlug = useMemo(
    () => slugify(tenantSlug || workspaceName),
    [tenantSlug, workspaceName]
  );

  if (!mounted) {
    return (
      <main className="login-stage flex min-h-screen items-center justify-center px-4 py-8 text-white">
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
    <main className="login-stage flex min-h-screen items-center justify-center px-4 py-8 text-white">
      <section className="login-card w-full max-w-xl rounded-[1.35rem] p-6 shadow-2xl sm:p-8 md:p-10">
        <div className="mb-8 flex justify-end">
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("signup_title")}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base">
          {t("signup_public_url")}{" "}
          <span className="font-semibold text-emerald-400">/d/{effectiveSlug || "workspace"}</span>
        </p>

        {result ? (
          <div className="mt-9 space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="font-semibold text-emerald-200">{t("verification_email_sent")}</p>
              <p className="mt-2 text-sm text-gray-300">{t("verification_email_desc")}</p>
            </div>
            {result.dev_verification_token && (
              <a
                className="login-primary block min-h-14 w-full rounded-2xl px-4 py-4 text-center text-base font-semibold text-white"
                href={`/verify-email?token=${encodeURIComponent(result.dev_verification_token)}`}
              >
                {t("verify_locally")}
              </a>
            )}
            <a className="mt-4 block text-center text-sm text-gray-400 transition hover:text-emerald-300" href="/">
              {t("back_home")}
            </a>
          </div>
        ) : (
          <form className="mt-9 space-y-5" onSubmit={submit}>
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base text-white outline-none placeholder:text-gray-400"
              placeholder={t("workspace_name")}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base text-white outline-none placeholder:text-gray-400"
              placeholder={t("workspace_slug")}
              value={tenantSlug || effectiveSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base text-white outline-none placeholder:text-gray-400"
              placeholder={t("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input
                className="login-input min-h-14 w-full rounded-2xl px-5 pr-14 text-base text-white outline-none placeholder:text-gray-400"
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-emerald-400"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            <button
              disabled={loading || !effectiveSlug}
              className="login-primary min-h-14 w-full rounded-2xl px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("creating_workspace") : t("create_workspace")}
            </button>
          </form>
        )}

        <a className="mt-8 block text-center text-sm text-gray-400 transition hover:text-emerald-300" href="/">
          {t("back_home")}
        </a>
      </section>
    </main>
  );
}
