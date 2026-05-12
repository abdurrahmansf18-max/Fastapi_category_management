"use client";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../src/i18n";
import { PlatformAuthApi } from "../../src/shared/api/auth";
import LanguageSwitcher from "../../src/shared/components/LanguageSwitcher";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default function SignupApp() {
  const { t } = useTranslation();
  const [workspaceName, setWorkspaceName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tenant_slug: string;
    verification_link: string;
    dev_verification_token?: string | null;
  } | null>(null);
  const [error, setError] = useState("");

  const effectiveSlug = useMemo(
    () => slugify(tenantSlug || workspaceName),
    [tenantSlug, workspaceName]
  );

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
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-gray-900 p-8 shadow-2xl">
        <div className="mb-8">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl font-bold">{t("signup_title")}</h1>
          <p className="mt-2 text-gray-400">
            {t("signup_public_url")} <span className="text-emerald-300">/d/{effectiveSlug || "workspace"}</span>.
          </p>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-semibold text-emerald-200">{t("verification_email_sent")}</p>
              <p className="mt-2 text-sm text-gray-300">
                {t("verification_email_desc")}
              </p>
            </div>
            {result.dev_verification_token && (
              <a
                className="block rounded-xl bg-emerald-600 px-4 py-3 text-center font-semibold hover:bg-emerald-500"
                href={`/verify-email?token=${encodeURIComponent(result.dev_verification_token)}`}
              >
                {t("verify_locally")}
              </a>
            )}
            <a className="block text-center text-sm text-gray-400 hover:text-white" href="/">
              {t("back_home")}
            </a>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder={t("workspace_name")}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder={t("workspace_slug")}
              value={tenantSlug || effectiveSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder={t("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder={t("password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            <button
              disabled={loading || !effectiveSlug}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-60"
            >
              {loading ? t("creating_workspace") : t("create_workspace")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
