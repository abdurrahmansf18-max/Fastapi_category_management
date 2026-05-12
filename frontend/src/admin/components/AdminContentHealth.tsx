import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2Off } from "lucide-react";

import { AdminHealthApi } from "../../shared/api/admin";

export default function AdminContentHealth() {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    AdminHealthApi.brokenLinks()
      .then((result) => setCount(result.count))
      .catch(() => setCount(null));
  }, []);

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-600 text-white">
          <Link2Off className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-950 dark:text-white">{t("content_health")}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {count === null
              ? t("loading")
              : count === 0
              ? t("no_broken_links")
              : t("broken_links_found", { count })}
          </p>
        </div>
      </div>
    </section>
  );
}
