"use client";

import { useEffect, useState } from "react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_code: string;
  owner_email: string;
  billing_status: string;
};

function readCookie(name: string) {
  const hit = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const csrf = readCookie("platform_csrf");
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const res = await fetch(`/api/platform${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

export default function PlatformAdminClient() {
  const [lang, setLang] = useState<"tr" | "en" | "ar">("tr");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [ops, setOps] = useState<any>(null);
  const copy = {
    tr: {
      loginTitle: "Platform sahibi girişi",
      loginDesc: "2FA korumalı yönetim konsolu.",
      email: "E-posta",
      password: "Şifre",
      totp: "TOTP kodu",
      login: "Giriş yap",
      owner: "Owner Panel",
      title: "Platform sağlığı ve tenantlar",
      refresh: "Yenile",
      billing: "Ödeme",
      public: "Public",
      admin: "Admin",
      impersonate: "Impersonate",
      impersonateReason: "Impersonation reason",
      ops: "Operational status",
      tenants: "Tenants",
      activeTenants: "Active tenants",
      activeSubscriptions: "Active subscriptions",
      queue: "Queue",
      backup: "Backup",
      restore: "Restore check",
      observability: "Observability",
      search: "Search",
      configured: "configured",
      notConfigured: "missing",
    },
    en: {
      loginTitle: "Platform owner login",
      loginDesc: "2FA protected owner console.",
      email: "Email",
      password: "Password",
      totp: "TOTP code",
      login: "Login",
      owner: "Owner Console",
      title: "Platform health and tenants",
      refresh: "Refresh",
      billing: "Billing",
      public: "Public",
      admin: "Admin",
      impersonate: "Impersonate",
      impersonateReason: "Reason for impersonation",
      ops: "Operational status",
      tenants: "Tenants",
      activeTenants: "Active tenants",
      activeSubscriptions: "Active subscriptions",
      queue: "Queue",
      backup: "Backup",
      restore: "Restore check",
      observability: "Observability",
      search: "Search",
      configured: "configured",
      notConfigured: "missing",
    },
    ar: {
      loginTitle: "تسجيل دخول مالك المنصة",
      loginDesc: "لوحة إدارة محمية بالمصادقة الثنائية.",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      totp: "رمز TOTP",
      login: "تسجيل الدخول",
      owner: "لوحة المالك",
      title: "صحة المنصة والمستأجرون",
      refresh: "تحديث",
      billing: "الدفع",
      public: "عام",
      admin: "الإدارة",
      impersonate: "انتحال",
      impersonateReason: "سبب الانتحال",
      ops: "حالة التشغيل",
      tenants: "المستأجرون",
      activeTenants: "المستأجرون النشطون",
      activeSubscriptions: "الاشتراكات النشطة",
      queue: "قائمة الانتظار",
      backup: "النسخ الاحتياطي",
      restore: "اختبار الاستعادة",
      observability: "المراقبة",
      search: "البحث",
      configured: "مهيأ",
      notConfigured: "ناقص",
    },
  }[lang];

  async function load() {
    const [rows, status] = await Promise.all([
      api("/tenants"),
      api("/ops/status").catch(() => null),
    ]);
    setTenants(rows);
    setOps(status);
    setLoggedIn(true);
  }

  useEffect(() => {
    const saved = localStorage.getItem("appLanguage") as "tr" | "en" | "ar" | null;
    if (saved === "tr" || saved === "en" || saved === "ar") setLang(saved);
    load().catch(() => setLoggedIn(false));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, totp_code: totpCode }),
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Login failed");
    }
  }

  async function setStatus(id: string, status: string) {
    await api(`/tenants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function setPlan(id: string, plan_code: string) {
    await api(`/tenants/${id}/plan`, {
      method: "PATCH",
      body: JSON.stringify({ plan_code, reason: "Owner panel override" }),
    });
    await load();
  }

  async function impersonate(tenant: Tenant) {
    const reason = window.prompt(copy.impersonateReason);
    if (!reason) return;
    const result = await api(`/tenants/${tenant.id}/impersonate`, {
      method: "POST",
      body: JSON.stringify({ reason, minutes: 15 }),
    });
    window.location.href = result.admin_url;
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-gray-950 px-4 py-10 text-white">
        <div className="mx-auto mb-4 flex max-w-md justify-end">
          <select className="rounded-lg bg-gray-900 px-3 py-2" value={lang} onChange={(e) => setLang(e.target.value as any)}>
            <option value="tr">TR</option>
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
        </div>
        <section className="mx-auto max-w-md rounded-xl border border-white/10 bg-gray-900 p-6 shadow-xl">
          <h1 className="text-2xl font-bold">{copy.loginTitle}</h1>
          <p className="mt-2 text-sm text-gray-400">{copy.loginDesc}</p>
          <form className="mt-6 space-y-3" onSubmit={login}>
            <input className="w-full rounded-lg bg-gray-800 px-4 py-3" placeholder={copy.email} value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full rounded-lg bg-gray-800 px-4 py-3" placeholder={copy.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className="w-full rounded-lg bg-gray-800 px-4 py-3" placeholder={copy.totp} value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            <button className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500">
              {copy.login}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-gray-100 px-3 py-5 text-gray-950 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">{copy.owner}</p>
            <h1 className="text-3xl font-bold sm:text-5xl">{copy.title}</h1>
          </div>
          <div className="flex gap-2">
            <select className="rounded-lg border px-3 py-2 dark:bg-gray-950" value={lang} onChange={(e) => setLang(e.target.value as any)}>
              <option value="tr">TR</option>
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>
            <button onClick={load} className="rounded-lg bg-gray-900 px-4 py-3 text-white dark:bg-white dark:text-gray-950">
              {copy.refresh}
            </button>
          </div>
        </div>

        {ops && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [copy.tenants, ops.tenants],
              [copy.activeTenants, ops.active_tenants],
              [copy.activeSubscriptions, ops.active_subscriptions],
              [copy.queue, ops.queue?.configured ? copy.configured : copy.notConfigured],
              [copy.backup, ops.backup?.last_backup?.message || (ops.backup?.configured ? copy.configured : copy.notConfigured)],
              [copy.restore, ops.backup?.last_restore_check?.message || copy.notConfigured],
              [copy.observability, ops.observability?.sentry?.configured ? "Sentry" : copy.notConfigured],
              [copy.search, ops.search?.configured ? copy.configured : copy.notConfigured],
            ].map(([label, value]) => (
              <article key={label} className="min-h-24 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-2 break-words text-lg font-bold">{String(value ?? "-")}</p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {tenants.map((tenant) => (
            <article key={tenant.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold">{tenant.name}</h2>
                  <p className="text-sm text-gray-500">/{tenant.slug} · {tenant.owner_email}</p>
                  <p className="mt-2 text-sm">{copy.billing}: {tenant.billing_status}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <select className="rounded-lg border px-3 py-2 dark:bg-gray-950" value={tenant.status} onChange={(e) => setStatus(tenant.id, e.target.value)}>
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                    <option value="pending_verification">pending</option>
                  </select>
                  <select className="rounded-lg border px-3 py-2 dark:bg-gray-950" value={tenant.plan_code} onChange={(e) => setPlan(tenant.id, e.target.value)}>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                  <a className="rounded-lg bg-emerald-600 px-4 py-2 text-center font-semibold text-white" href={`/d/${tenant.slug}`}>
                    {copy.public}
                  </a>
                  <a className="rounded-lg bg-gray-900 px-4 py-2 text-center font-semibold text-white dark:bg-white dark:text-gray-950" href={`/d/${tenant.slug}/admin`}>
                    {copy.admin}
                  </a>
                  <button className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-center font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100" onClick={() => impersonate(tenant)}>
                    {copy.impersonate}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
