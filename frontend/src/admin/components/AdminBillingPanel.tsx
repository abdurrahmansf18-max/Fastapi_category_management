import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, ExternalLink } from "lucide-react";

import { AdminBillingApi } from "../../shared/api/admin";

export default function AdminBillingPanel({ usage }: { usage: any }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const plan = usage?.plan_code || "free";

  const openBilling = async (type: "checkout" | "portal") => {
    setLoading(type);
    try {
      const result =
        type === "checkout"
          ? await AdminBillingApi.checkout()
          : await AdminBillingApi.portal();
      if (result.url) window.location.href = result.url;
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-950">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-950 dark:text-white">{t("billing_plan")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("current_plan")}: <span className="font-semibold uppercase">{plan}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {plan !== "pro" && (
            <button
              type="button"
              onClick={() => openBilling("checkout")}
              disabled={loading !== null}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              <ExternalLink className="h-4 w-4" />
              {loading === "checkout" ? t("loading") : t("upgrade_to_pro")}
            </button>
          )}
          <button
            type="button"
            onClick={() => openBilling("portal")}
            disabled={loading !== null}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-600 dark:border-gray-700 dark:text-gray-200"
          >
            <ExternalLink className="h-4 w-4" />
            {loading === "portal" ? t("loading") : t("manage_billing")}
          </button>
        </div>
      </div>
    </section>
  );
}
