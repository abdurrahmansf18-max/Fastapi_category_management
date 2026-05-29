"use client";

import { useEffect } from "react";

type PageViewEvent = {
  tenantSlug: string;
  title: string;
  contentId?: string;
  url?: string;
};

export function trackTenantPageView({ tenantSlug, title, contentId, url }: PageViewEvent) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    url: url || `${window.location.pathname}${window.location.search}`,
    title,
    content_id: contentId || null,
  });
  const endpoint = `/api/t/${tenantSlug}/analytics/page-view`;

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(endpoint, blob)) return;
  }

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

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
    trackTenantPageView({ tenantSlug, title, contentId });
  }, [contentId, tenantSlug, title]);

  return null;
}
