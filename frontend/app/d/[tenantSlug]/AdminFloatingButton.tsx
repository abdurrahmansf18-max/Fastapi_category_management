"use client";
import { useEffect, useState } from "react";

export default function AdminFloatingButton({
  tenantSlug,
  label,
  title,
}: {
  tenantSlug: string;
  label: string;
  title: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch(`/api/t/${tenantSlug}/admin/me`, { credentials: "include" })
      .then((r) => { if (r.ok) setShow(true); })
      .catch(() => {});
  }, [tenantSlug]);

  if (!show) return null;

  return (
    <a
      href={`/d/${tenantSlug}/admin`}
      title={title}
      aria-label={title}
      className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl ring-1 ring-white/20 transition-all hover:bg-emerald-700 hover:ring-emerald-500"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      {label}
    </a>
  );
}
