import { useTranslation } from "react-i18next";

type UsagePayload = {
  usage?: Record<string, number>;
  limits?: Record<string, number>;
};

function mb(value: number | undefined) {
  return Math.round((value || 0) / 1024 / 1024);
}

export default function AdminUsageBar({ usage }: { usage: UsagePayload | null }) {
  const { t } = useTranslation();
  if (!usage) return null;

  const items = [
    ["admins", t("admins"), usage.usage?.admins, usage.limits?.admins],
    ["categories", t("categories"), usage.usage?.categories, usage.limits?.categories],
    ["headings", t("headings"), usage.usage?.headings, usage.limits?.headings],
    ["contents", t("contents"), usage.usage?.contents, usage.limits?.contents],
    ["ai", t("ai_monthly"), usage.usage?.ai_monthly, usage.limits?.ai_monthly_limit],
    ["upload", t("upload_image"), mb(usage.usage?.upload_bytes), mb(usage.limits?.upload_bytes)],
  ] as const;

  return (
    <section className="grid gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map(([key, label, used, limit]) => {
        const safeLimit = Number(limit) || 0;
        const safeUsed = Number(used) || 0;
        const percent = safeLimit > 0 ? Math.min(100, Math.round((safeUsed / safeLimit) * 100)) : 0;
        return (
          <div key={String(key)} className="rounded-md border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold uppercase text-gray-500">{label}</p>
              <p className="shrink-0 text-sm font-bold text-gray-900 dark:text-white">
                {safeUsed}/{safeLimit}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
