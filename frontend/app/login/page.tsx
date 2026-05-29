"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import "../../src/i18n";
import LanguageSwitcher from "../../src/shared/components/LanguageSwitcher";
import { PlatformAuthApi, type WorkspaceOption } from "../../src/shared/api/auth";
import { localizeBackendError } from "../../src/shared/utils/localizeError";

function toPublicUrl(url?: string): string {
  if (!url) return "";
  const m = url.match(/^https?:\/\/[^/]+(:\d+)?(\/api\/.+)$/);
  return m ? m[2] : url;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [selectionToken, setSelectionToken] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [suggestedSlug, setSuggestedSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workspaceLogo, setWorkspaceLogo] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    setSuggestedSlug(q.get("workspace") || "");
  }, []);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.tenant_slug === selectedSlug) || null,
    [selectedSlug, workspaces]
  );
  const brandedSlug = selectedSlug || suggestedSlug;
  const brandedName = workspaceName || selectedWorkspace?.workspace_name || brandedSlug;

  useEffect(() => {
    if (!brandedSlug) {
      setWorkspaceLogo("");
      setWorkspaceName("");
      return;
    }

    const controller = new AbortController();
    setWorkspaceName(selectedWorkspace?.workspace_name || brandedSlug);
    setWorkspaceLogo("");

    fetch(`/api/t/${encodeURIComponent(brandedSlug)}/settings`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setWorkspaceName(data.site_title || selectedWorkspace?.workspace_name || brandedSlug);
        setWorkspaceLogo(data.site_logo ? toPublicUrl(data.site_logo) : "");
      })
      .catch(() => {});

    return () => controller.abort();
  }, [brandedSlug, selectedWorkspace?.workspace_name]);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await PlatformAuthApi.login(email, password);
      setSelectionToken(response.selection_token);
      setWorkspaces(response.workspaces);
      const preferred =
        response.workspaces.find((workspace) => workspace.tenant_slug === suggestedSlug)?.tenant_slug ||
        response.workspaces[0]?.tenant_slug ||
        "";
      setSelectedSlug(preferred);
      if (!response.workspaces.length) {
        setError(t("no_workspace_access"));
      }
    } catch (err: any) {
      setError(localizeBackendError(err?.message, t) || t("login_failed"));
    } finally {
      setLoading(false);
    }
  }

  async function continueToAdmin() {
    if (!selectionToken || !selectedSlug) return;
    setError("");
    setLoading(true);
    try {
      await PlatformAuthApi.selectWorkspace(selectionToken, selectedSlug);
      window.location.href = `/d/${selectedSlug}/admin`;
    } catch (err: any) {
      setError(localizeBackendError(err?.message, t) || t("login_failed"));
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <main className="login-stage flex min-h-screen items-start justify-center overflow-y-auto px-4 py-6 sm:items-center sm:py-8">
        <section className="login-card w-full max-w-xl rounded-[1.35rem] p-6 shadow-2xl sm:p-8 md:p-10" />
      </main>
    );
  }

  return (
    <main className="login-stage flex min-h-screen items-start justify-center overflow-y-auto px-4 py-6 sm:items-center sm:py-8">
      <section className="login-card w-full max-w-xl rounded-[1.35rem] p-6 shadow-2xl sm:p-8 md:p-10">

        {/* Top bar: language switcher */}
        <div className="mb-8 flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Workspace identity block */}
        {brandedSlug && (
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg ring-2 ring-emerald-400/30">
              {workspaceLogo ? (
                <img src={workspaceLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-extrabold text-white">
                  {brandedName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {t("prefilled_workspace")}
              </p>
              <p className="truncate text-lg font-bold text-gray-900 dark:text-white">
                {brandedName}
              </p>
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("central_login_title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
          {t("central_login_subtitle")}
        </p>

        {!selectionToken ? (
          <form className="mt-9 space-y-4" onSubmit={submitLogin}>
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
              disabled={loading}
              className="login-primary min-h-14 w-full rounded-2xl px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("loading") : t("login_to_continue")}
            </button>

            {/* Şifremi unuttum — belirgin */}
            <div className="pt-1 text-center">
              <a
                href="/forgot-password"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {t("forgot_password")}
              </a>
            </div>
          </form>
        ) : (
          <div className="mt-9 space-y-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("workspace_select_title")}
            </label>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base outline-none"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.tenant_id} value={workspace.tenant_slug}>
                  {workspace.workspace_name} (/d/{workspace.tenant_slug})
                </option>
              ))}
            </select>
            {selectedWorkspace && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedWorkspace.role === "owner" ? t("role_owner") : t("role_admin")}
              </p>
            )}
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={continueToAdmin}
              disabled={!selectedSlug || loading}
              className="login-primary min-h-14 w-full rounded-2xl px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("loading") : t("continue_to_admin")}
            </button>
          </div>
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
