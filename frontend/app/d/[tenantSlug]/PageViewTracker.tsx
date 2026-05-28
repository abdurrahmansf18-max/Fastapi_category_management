"use client";

import { useEffect } from "react";

export default function PageViewTracker({
  tenantSlug,
  title,
  contentId,
}: {
  tenantSlug: string;
  title: string;
  contentId?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload = JSON.stringify({
      url: `${window.location.pathname}${window.location.search}`,
      title,
      content_id: contentId || null,
    });
    const endpoint = `/api/t/${tenantSlug}/analytics/page-view`;

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [contentId, tenantSlug, title]);

  return null;
}
