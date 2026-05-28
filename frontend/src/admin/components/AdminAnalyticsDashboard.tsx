import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Eye, RefreshCw, SearchX, Users } from "lucide-react";
import { AdminAnalyticsApi, type AdminAnalyticsOverview } from "../../shared/api/admin";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-400">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
    </div>
  );
}

export default function AdminAnalyticsDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    AdminAnalyticsApi.overview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const zeroResultCount = useMemo(
    () => data?.zero_result_queries.reduce((total, row) => total + Number(row.search_count || 0), 0) ?? 0,
    [data]
  );

  return (
    <section className="section-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("analytics_dashboard")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("analytics_dashboard_desc")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label={t("refresh")}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t("page_views")} value={Number(data?.summary.page_views || 0)} icon={<Eye className="h-4 w-4" />} />
            <StatCard label={t("viewed_pages")} value={Number(data?.summary.viewed_pages || 0)} icon={<BarChart3 className="h-4 w-4" />} />
            <StatCard label={t("visitors")} value={Number(data?.summary.visitors || 0)} icon={<Users className="h-4 w-4" />} />
            <StatCard label={t("zero_result_searches")} value={zeroResultCount} icon={<SearchX className="h-4 w-4" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("most_read_pages")}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {(data?.top_pages || []).length === 0 ? (
                  <p className="p-4 text-xs text-gray-500 dark:text-gray-400">{t("no_analytics_data")}</p>
                ) : (
                  data?.top_pages.map((row) => (
                    <a
                      key={row.url}
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 px-4 py-3 text-xs transition hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    >
                      <span className="min-w-0 truncate font-medium text-gray-700 dark:text-gray-200">{row.title || row.url}</span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {Number(row.view_count).toLocaleString()}
                      </span>
                    </a>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("zero_result_queries")}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {(data?.zero_result_queries || []).length === 0 ? (
                  <p className="p-4 text-xs text-gray-500 dark:text-gray-400">{t("no_zero_result_queries")}</p>
                ) : (
                  data?.zero_result_queries.map((row) => (
                    <div key={`${row.source}:${row.query}`} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-700 dark:text-gray-200">{row.query}</p>
                        <p className="mt-0.5 text-gray-400">{row.source}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                        {Number(row.search_count).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
