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

  useEffect(() => { load(); }, []);

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
    <section className="section-card !p-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("search_insights")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("search_insights_desc")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 hover:text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={queueReindex}
            disabled={reindexing}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reindexing ? "animate-spin" : ""}`} />
            {t("reindex_search")}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="m-5 h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      ) : rows.length === 0 ? (
        <p className="m-5 rounded-xl border border-dashed border-gray-300 p-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-500">
          {t("no_search_data")}
        </p>
      ) : (
        <div>
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800/40">
                <th className="px-5 py-2.5 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("query")}</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("source")}</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("search_count")}</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("avg_results")}</th>
              </tr>
            </thead>
          </table>
          <div className="max-h-64 overflow-y-auto">
            <table className="min-w-full text-left text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {rows.map((row) => (
                  <tr key={`${row.source}:${row.query}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="w-1/2 max-w-0 truncate px-5 py-3 font-medium text-gray-800 dark:text-gray-200" title={row.query}>
                      {row.query}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.source}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{row.search_count}</td>
                    <td className={`px-4 py-3 font-bold ${Number(row.avg_results) === 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {row.avg_results}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700/60 px-5 py-2.5">
            <p className="text-xs text-gray-400">{rows.length} {t("items")}</p>
          </div>
        </div>
      )}
    </section>
  );
}
