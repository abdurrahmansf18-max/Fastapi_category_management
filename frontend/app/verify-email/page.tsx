"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../src/i18n";
import { PlatformAuthApi } from "../../src/shared/api/auth";
import LanguageSwitcher from "../../src/shared/components/LanguageSwitcher";

export default function VerifyEmailApp() {
  const { t } = useTranslation();
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError(t("verification_token_missing"));
      setLoading(false);
      return;
    }
    PlatformAuthApi.verifyEmail(token)
      .then((res) => setTenantSlug(res.tenant_slug))
      .catch((err) => setError(err?.message || t("verification_failed")))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900 p-8 text-center shadow-2xl">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        {loading ? (
          <p className="text-gray-300">{t("verifying")}</p>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold text-red-200">{t("verification_failed")}</h1>
            <p className="mt-3 text-gray-300">{error}</p>
            <a className="mt-6 inline-block rounded-xl bg-gray-800 px-4 py-3 hover:bg-gray-700" href="/signup">
              {t("create_new_workspace")}
            </a>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-emerald-200">{t("workspace_activated")}</h1>
            <p className="mt-3 text-gray-300">{t("workspace_ready")}</p>
            <div className="mt-6 flex flex-col gap-3">
              <a className="rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500" href={`/d/${tenantSlug}/admin`}>
                {t("open_admin_panel")}
              </a>
              <a className="rounded-xl bg-gray-800 px-4 py-3 hover:bg-gray-700" href={`/d/${tenantSlug}`}>
                {t("view_public_site")}
              </a>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
