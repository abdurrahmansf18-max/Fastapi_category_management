"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "../../src/i18n";
import LanguageSwitcher from "../../src/shared/components/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Request failed");
      }
      setSent(true);
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
          {t("forgot_password_title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base">
          {t("forgot_password_desc")}
        </p>

        {sent ? (
          <div className="mt-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-6 text-center">
            <p className="text-emerald-300 font-medium">{t("reset_link_sent")}</p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm text-gray-400 transition hover:text-emerald-300"
            >
              ← {t("central_login_title")}
            </a>
          </div>
        ) : (
          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            <input
              className="login-input min-h-14 w-full rounded-2xl px-5 text-base text-white outline-none placeholder:text-gray-400"
              placeholder={t("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
            )}
            <button
              disabled={loading}
              className="login-primary min-h-14 w-full rounded-2xl px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t("loading") : t("send_reset_link")}
            </button>
          </form>
        )}

        <a
          className="mt-8 block text-center text-sm text-gray-400 transition hover:text-emerald-300"
          href="/login"
        >
          {t("back_home") === "Back home" ? "← Back to login" : `← ${t("central_login_title")}`}
        </a>
      </section>
    </main>
  );
}
