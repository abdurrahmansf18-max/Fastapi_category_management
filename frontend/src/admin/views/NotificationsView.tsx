"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, ExternalLink, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";

type FeedbackItem = {
  id: string;
  url: string;
  rating: "helpful" | "not_helpful";
  message: string | null;
  created_at: string;
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function NotificationsView({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 30;

  async function load(reset = false) {
    setLoading(true);
    setError("");
    const currentOffset = reset ? 0 : offset;
    try {
      const res = await fetch(
        `/api/t/${tenantSlug}/admin/feedback?limit=${LIMIT + 1}&offset=${currentOffset}`,
        { credentials: "include", headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeedbackItem[] = await res.json();
      const hasNext = data.length > LIMIT;
      if (reset) {
        setItems(data.slice(0, LIMIT));
        setOffset(LIMIT);
      } else {
        setItems((prev) => [...prev, ...data.slice(0, LIMIT)]);
        setOffset(currentOffset + LIMIT);
      }
      setHasMore(hasNext);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  return (
    <section id="admin-notifications" className="scroll-mt-36">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {t("notifications")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("feedback_notifications_desc")}
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mb-3 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && items.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Bell className="h-10 w-10 text-gray-300 dark:text-gray-700" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("no_feedback_yet")}</p>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            {/* Top row: rating badge + anonymous + date */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  item.rating === "helpful"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {item.rating === "helpful" ? (
                  <ThumbsUp className="h-3 w-3" />
                ) : (
                  <ThumbsDown className="h-3 w-3" />
                )}
                {item.rating === "helpful" ? t("feedback_helpful") : t("feedback_not_helpful")}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {t("anonymous_user")}
              </span>
              <span className="ms-auto text-xs text-gray-400">{fmtDate(item.created_at)}</span>
            </div>

            {/* URL */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.url}</span>
            </a>

            {/* Optional message */}
            {item.message && (
              <p className="mt-2.5 rounded-lg bg-gray-50 px-3 py-2 text-sm leading-relaxed text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                {item.message}
              </p>
            )}
          </article>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => load(false)}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-2.5 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          {loading ? t("loading") : t("load_more")}
        </button>
      )}
    </section>
  );
}
