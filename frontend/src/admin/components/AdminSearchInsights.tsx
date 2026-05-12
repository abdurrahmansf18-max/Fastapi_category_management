import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, RefreshCw } from "lucide-react";

import { AdminSearchApi, type SearchAnalyticsRow } from "../../shared/api/admin";

export default function AdminSearchInsights() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SearchAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = () => {
    setLoading(true);
    AdminSearchApi.analytics()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const queueReindex = async () => {
    setReindexing(true);
    setNotice("");
    try {
      await AdminSearchApi.reindex();
      setNotice(t("reindex_queued"));
    } finally {
      setReindexing(false);
    }
  };

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-950 dark:text-white">{t("search_insights")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("search_insights_desc")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={queueReindex}
          disabled={reindexing}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${reindexing ? "animate-spin" : ""}`} />
          {t("reindex_search")}
        </button>
      </div>

      {notice && (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="h-20 animate-pulse rounded-md bg-gray-100 dark:bg-gray-900" />
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          {t("no_search_data")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="py-2 pr-4 font-semibold">{t("query")}</th>
                <th className="py-2 pr-4 font-semibold">{t("source")}</th>
                <th className="py-2 pr-4 font-semibold">{t("search_count")}</th>
                <th className="py-2 pr-4 font-semibold">{t("avg_results")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
              {rows.map((row) => (
                <tr key={`${row.source}:${row.query}`} className="text-gray-800 dark:text-gray-200">
                  <td className="max-w-[18rem] truncate py-3 pr-4 font-medium" title={row.query}>
                    {row.query}
                  </td>
                  <td className="py-3 pr-4">{row.source}</td>
                  <td className="py-3 pr-4">{row.search_count}</td>
                  <td className="py-3 pr-4">{row.avg_results}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
