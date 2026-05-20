"use client";
import { useEffect, useState } from "react";

type ProStatus = "loading" | "not-admin" | "free" | "pro";
type CtaStatus = "idle" | "loading" | "error";

interface ProLabels {
  proUpgradeBtn: string;
  proActiveBtn: string;
  proModalUpgradeTitle: string;
  proModalActiveTitle: string;
  proFeaturesTitle: string;
  proActiveFeaturesTitle: string;
  proFeatures: string[];
  proUpgradeCta: string;
  proUpgradeLoading: string;
  proUpgradeError: string;
  proManageSub: string;
  proOnlyForYou: string;
  proFreeNote: string;
  close: string;
}

const SPARKLE_POSITIONS = [
  { top: "-8px", left: "10px", delay: "0s", size: "10px" },
  { top: "-6px", right: "14px", delay: "0.4s", size: "8px" },
  { bottom: "-6px", left: "18px", delay: "0.8s", size: "7px" },
  { top: "4px", right: "-8px", delay: "0.2s", size: "9px" },
];

function Sparkle({ style }: { style: React.CSSProperties }) {
  return (
    <span
      className="pointer-events-none absolute animate-ping rounded-full bg-yellow-300 opacity-75"
      style={style}
    />
  );
}

export default function ProStatusButton({
  tenantSlug,
  labels,
}: {
  tenantSlug: string;
  labels: ProLabels;
}) {
  const [status, setStatus] = useState<ProStatus>("loading");
  const [open, setOpen] = useState(false);
  const [ctaStatus, setCtaStatus] = useState<CtaStatus>("idle");

  useEffect(() => {
    async function check() {
      try {
        const meRes = await fetch(`/api/t/${tenantSlug}/admin/me`, { credentials: "include" });
        if (!meRes.ok) { setStatus("not-admin"); return; }
        const billingRes = await fetch(`/api/t/${tenantSlug}/billing/status`, { credentials: "include" });
        if (!billingRes.ok) { setStatus("free"); return; }
        const billing = await billingRes.json();
        setStatus(billing.plan_code === "pro" ? "pro" : "free");
      } catch {
        setStatus("not-admin");
      }
    }
    check();
  }, [tenantSlug]);

  async function handleUpgrade() {
    setCtaStatus("loading");
    try {
      const res = await fetch(`/api/t/${tenantSlug}/admin/billing/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) { setCtaStatus("error"); return; }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.form_content) {
        // Iyzico form POST — inject and submit
        const div = document.createElement("div");
        div.innerHTML = data.form_content;
        document.body.appendChild(div);
        const form = div.querySelector("form");
        if (form) form.submit();
        else setCtaStatus("error");
      } else {
        setCtaStatus("error");
      }
    } catch {
      setCtaStatus("error");
    }
  }

  function handleManage() {
    window.location.href = `/d/${tenantSlug}/admin`;
  }

  if (status === "loading" || status === "not-admin") return null;

  const isPro = status === "pro";

  return (
    <>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 12px 2px rgba(251,191,36,0.7), 0 0 28px 4px rgba(251,191,36,0.3); }
          50% { box-shadow: 0 0 22px 6px rgba(251,191,36,0.9), 0 0 48px 10px rgba(251,191,36,0.5); }
        }
        @keyframes pro-glow {
          0%, 100% { box-shadow: 0 0 12px 2px rgba(139,92,246,0.6), 0 0 24px 4px rgba(139,92,246,0.25); }
          50% { box-shadow: 0 0 20px 5px rgba(139,92,246,0.8), 0 0 40px 8px rgba(139,92,246,0.4); }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Floating button */}
      <div className="fixed bottom-[4.5rem] end-5 z-50">
        <button
          onClick={() => setOpen(true)}
          className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 ${
            isPro
              ? "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600"
              : "bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400"
          }`}
          style={{
            animation: isPro
              ? "pro-glow 2.5s ease-in-out infinite, float 3s ease-in-out infinite"
              : "glow-pulse 2s ease-in-out infinite, float 3s ease-in-out infinite",
          }}
        >
          {/* Sparkles (free only) */}
          {!isPro && SPARKLE_POSITIONS.map((pos, i) => (
            <Sparkle
              key={i}
              style={{
                top: pos.top,
                left: pos.left,
                right: (pos as { right?: string }).right,
                bottom: (pos as { bottom?: string }).bottom,
                width: pos.size,
                height: pos.size,
                animationDelay: pos.delay,
                animationDuration: "1.2s",
              }}
            />
          ))}

          {isPro ? (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 7l4 8 6-10 6 10 4-8-2 11H4L2 7z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          <span>{isPro ? labels.proActiveBtn : labels.proUpgradeBtn}</span>

          {/* Pro badge */}
          {isPro && (
            <span className="ms-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-black tracking-wide">
              PRO
            </span>
          )}
        </button>
      </div>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-end p-4 sm:items-center sm:justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 sm:max-w-md"
            style={{ animation: "modal-in .28s cubic-bezier(.22,.61,.36,1) forwards" }}
          >
            {/* Modal header */}
            <div
              className={`relative overflow-hidden p-6 text-white ${
                isPro
                  ? "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700"
                  : "bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-500"
              }`}
            >
              {/* Background decoration */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

              <div className="relative flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    {isPro ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg">👑</span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-lg">⚡</span>
                    )}
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black tracking-widest">
                      {isPro ? "PRO AKTIF" : "PRO PLAN"}
                    </span>
                  </div>
                  <h2 className="text-xl font-black leading-tight">
                    {isPro ? labels.proModalActiveTitle : labels.proModalUpgradeTitle}
                  </h2>
                  <p className="mt-1 text-xs font-medium opacity-80">
                    {labels.proOnlyForYou}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                  aria-label={labels.close}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Free plan note */}
              {!isPro && (
                <p className="relative mt-3 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium">
                  {labels.proFreeNote}
                </p>
              )}
            </div>

            {/* Features list */}
            <div className="p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {isPro ? labels.proActiveFeaturesTitle : labels.proFeaturesTitle}
              </p>

              <ul className="space-y-2.5">
                {labels.proFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        isPro
                          ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                          : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                      }`}
                    >
                      {isPro ? "✓" : "★"}
                    </span>
                    <span className="text-sm leading-snug text-gray-700 dark:text-gray-200">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA buttons */}
              <div className="mt-5 flex gap-2.5">
                {isPro ? (
                  <button
                    type="button"
                    onClick={handleManage}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-violet-500/30"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {labels.proManageSub}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUpgrade}
                    disabled={ctaStatus === "loading"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-amber-500 hover:to-orange-600 hover:shadow-orange-400/30 disabled:opacity-60"
                  >
                    {ctaStatus === "loading" ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        {labels.proUpgradeLoading}
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {labels.proUpgradeCta}
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); setCtaStatus("idle"); }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {labels.close}
                </button>
              </div>

              {/* Error message */}
              {ctaStatus === "error" && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  {labels.proUpgradeError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
