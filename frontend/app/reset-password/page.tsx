"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import "../../src/i18n";
import LanguageSwitcher from "../../src/shared/components/LanguageSwitcher";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    setToken(q.get("token") || "");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("passwords_no_match"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.detail || "Request failed";
        // Token geçersiz/süresi dolmuş
        if (res.status === 400) {
          throw new Error(t("invalid_reset_token"));
        }
        throw new Error(msg);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
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

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("reset_password_title")}
        </h1>

        {!token ? (
          <div className="mt-9 rounded-2xl bg-red-500/15 border border-red-500/30 p-6 text-center">
            <p className="text-red-300 font-medium">{t("invalid_reset_token")}</p>
            <a href="/forgot-password" className="mt-4 inline-block text-sm text-gray-400 transition hover:text-emerald-300">
              {t("forgot_password")}
            </a>
          </div>
        ) : success ? (
          <div className="mt-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-6 text-center">
            <p className="text-emerald-300 font-medium">{t("password_reset_success")}</p>
            <a href="/login" className="mt-4 inline-block text-sm text-gray-400 transition hover:text-emerald-300">
              → {t("central_login_title")}
            </a>
          </div>
        ) : (
          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <input
                className="login-input min-h-14 w-full rounded-2xl px-5 pr-14 text-base text-white outline-none placeholder:text-gray-400"
                placeholder={t("new_password")}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
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
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base text-white outline-none placeholder:text-gray-400"
              placeholder={t("confirm_new_password")}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
            )}
            <button
              disabled={loading}
              className="login-primary min-h-14 w-full rounded-2xl px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("loading") : t("reset_password_submit")}
            </button>
          </form>
        )}

        <a
          className="mt-8 block text-center text-sm text-gray-400 transition hover:text-emerald-300"
          href="/login"
        >
          ← {t("central_login_title")}
        </a>
      </section>
    </main>
  );
}
