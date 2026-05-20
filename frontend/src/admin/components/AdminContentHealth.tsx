import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2Off, CheckCircle2 } from "lucide-react";
import { AdminHealthApi } from "../../shared/api/admin";

export default function AdminContentHealth() {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    AdminHealthApi.brokenLinks()
      .then((r) => setCount(r.count))
      .catch(() => setCount(null));
  }, []);

  const isOk = count === 0;

  return (
    <section className="section-card flex items-center gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        isOk
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      }`}>
        {isOk ? <CheckCircle2 className="h-5 w-5" /> : <Link2Off className="h-5 w-5" />}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("content_health")}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {count === null
            ? t("loading")
            : count === 0
            ? t("no_broken_links")
            : t("broken_links_found", { count })}
        </p>
      </div>
    </section>
  );
}
