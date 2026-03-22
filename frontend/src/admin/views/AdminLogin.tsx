import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../shared/context/SettingsContext";
import LanguageSwitcher from "../../shared/components/LanguageSwitcher";

// FlashIcon component for login logo
export function FlashIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M13 5L8 13h3l-1 6 6-9h-3l1-5z" fill="#000" />
    </svg>
  );
}

interface AdminLoginProps {
  login: (e: string, p: string) => Promise<string>;
  authLoading: boolean;
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  notification: { message: string; type: "error" | "success" | "warning" } | null;
  showNotification: (m: string, t?: "error" | "success" | "warning") => void;
  clearNotification: () => void;
}

export default function AdminLogin({
  login,
  authLoading,
  theme,
  setTheme,
  notification,
  showNotification,
  clearNotification,
}: AdminLoginProps) {
  const { t } = useTranslation();
  const { siteTitle, siteLogo } = useSettings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const normalizeError = (err: any): string => {
    try {
      const detail = err?.response?.data?.detail ?? err?.detail ?? err;
      if (Array.isArray(detail) && detail.length) {
        const msgs = detail.map((d: any) => d?.msg || "").filter(Boolean);
        if (msgs.length) return msgs.join(" • ");
      }
      if (typeof detail === "string") return detail;
    } catch {}
    return "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";
  };

  return (
    <div
      className={`
        min-h-screen flex items-center justify-center relative overflow-hidden
        bg-gradient-to-br
        from-gray-100 via-gray-200 to-gray-300
        dark:from-gray-950 dark:via-gray-900 dark:to-gray-800/20
      `}
    >
      <div className="pointer-events-none absolute inset-0">
        {/* Light mode enhanced glow */}
        <div
          className="absolute top-1/4 left-1/3 w-[800px] h-[800px]
                        rounded-full blur-3xl bg-emerald-600/20 dark:hidden animate-pulse"
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px]
                        rounded-full blur-3xl bg-forest-600/15 dark:hidden animate-pulse"
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]
                        rounded-full blur-3xl bg-emerald-700/10 dark:hidden"
        />

        {/* Dark mode enhanced glow */}
        <div
          className="hidden dark:block absolute top-1/4 left-1/3 w-[800px] h-[800px]
                        rounded-full blur-3xl bg-emerald-600/25 animate-pulse"
        />
        <div
          className="hidden dark:block absolute bottom-1/3 right-1/4 w-[600px] h-[600px]
                        rounded-full blur-3xl bg-emerald-700/20 animate-pulse"
        />
        <div
          className="hidden dark:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]
                        rounded-full blur-3xl bg-emerald-800/15"
        />
      </div>

      {/* Enhanced floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-lime-400/40 dark:bg-lime-400/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* --- TOAST (ortalanmış modal) --- */}
      {notification && (
        <>
          <style>{`
            @keyframes modalIn { from { opacity:0; transform: scale(0.95) } to { opacity:1; transform: scale(1) } }
          `}</style>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
              className={[
                "animate-[modalIn_.25s_ease-out] max-w-md w-full mx-4",
                "rounded-2xl shadow-2xl px-6 py-5 border backdrop-blur-md",
                notification.type === "error"
                  ? "bg-red-50/95 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                  : notification.type === "warning"
                  ? "bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
                  : "bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
              ].join(" ")}
              style={{
                boxShadow:
                  notification.type === "error"
                    ? "0 20px 50px rgba(239,68,68,.35)"
                    : notification.type === "warning"
                    ? "0 20px 50px rgba(245,158,11,.35)"
                    : "0 20px 50px rgba(16,185,129,.30)",
              }}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">
                  {notification.type === "error"
                    ? "⚠️"
                    : notification.type === "warning"
                    ? "💡"
                    : "✅"}
                </span>
                <p className="font-medium text-base flex-1">
                  {notification.message}
                </p>
                <button
                  onClick={clearNotification}
                  className="ml-2 text-xl leading-none hover:opacity-70 transition-opacity"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div
        className="
          relative z-10 w-full max-w-lg group
          transition-all duration-500
          hover:scale-[1.02]
        "
      >
        <div
          className="
            rounded-3xl border
            border-gray-200/50 dark:border-gray-800/50 p-12
            bg-white/95 dark:bg-gray-900/90 backdrop-blur-3xl
            shadow-[0_40px_140px_rgba(132,204,22,.20)]
            dark:shadow-[0_40px_140px_rgba(132,204,22,.15)]
            transition-all duration-500
            group-hover:shadow-[0_50px_180px_rgba(132,204,22,.35)]
            group-hover:border-lime-400/40
            relative overflow-hidden
          "
        >
          {/* Animated border gradient */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-lime-500/20 via-emerald-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

          <div className="relative z-10">
            <div className="text-center mb-12">
              <div
                className="
                  inline-flex items-center justify-center w-20 h-20 rounded-3xl
                  bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 mb-6 
                  shadow-2xl shadow-emerald-700/40
                  ring-4 ring-emerald-600/30 group-hover:scale-110 group-hover:rotate-3 
                  transition-all duration-500 overflow-hidden
                "
              >
                {siteLogo ? (
                  <img src={siteLogo} alt="Site Logo" className="w-full h-full object-cover" />
                ) : (
                  <FlashIcon className="w-10 h-10 text-white" />
                )}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {siteTitle}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-base mt-2 font-medium">
                {t("admin_panel")}
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await login(email, password);
                  showNotification(t("success") || "Login successful", "success");
                } catch (err: any) {
                  showNotification(t("error") || "Login failed", "error");
                }
              }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder={t("email_placeholder")}
                  className="
                    w-full rounded-2xl border border-gray-300/60 dark:border-gray-700/50
                    bg-white/90 dark:bg-gray-800/80 px-6 py-4 text-lg
                    text-gray-900 dark:text-gray-100 shadow-sm
                    focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none
                    transition-all duration-300 placeholder:text-gray-500
                    hover:border-lime-400/50 hover:shadow-md hover:shadow-lime-500/10
                  "
                />

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder={t("password_placeholder")}
                  className="
                    w-full rounded-2xl border border-gray-300/60 dark:border-gray-700/50
                    bg-white/90 dark:bg-gray-800/80 px-6 py-4 text-lg
                    text-gray-900 dark:text-gray-100 shadow-sm
                    focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none
                    transition-all duration-300 placeholder:text-gray-500
                    hover:border-lime-400/50 hover:shadow-md hover:shadow-lime-500/10
                  "
                />
              </div>

              <button
                className="
                  w-full py-4 rounded-2xl text-white font-bold text-lg
                  bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800
                  shadow-lg hover:shadow-xl hover:shadow-emerald-700/40
                  hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                  relative overflow-hidden group
                "
                disabled={authLoading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10">
                  {authLoading ? t("loading") : `🔐 ${t("Login")}`}
                </span>
              </button>
            </form>

            <div
              className="
                mt-10 p-6 rounded-2xl border
                bg-gradient-to-br from-emerald-100/80 via-emerald-50/60 to-emerald-100/80
                dark:from-emerald-900/40 dark:via-emerald-950/30 dark:to-emerald-900/40
                border-emerald-300/60 dark:border-emerald-700/50
                text-emerald-900 dark:text-emerald-100 shadow-inner
                backdrop-blur-sm
              "
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">🛡️</div>
                <div className="text-sm leading-7">
                  <div className="font-bold text-base mb-2">
                    {t("secure_access")}
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-emerald-800 dark:text-emerald-200">
                    <li>{t("secure_access_desc1")}</li>
                    <li>{t("secure_access_desc2")}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() =>
                  setTheme((t) => (t === "dark" ? "light" : "dark"))
                }
                className="
                  p-4 rounded-2xl border border-gray-300/60 dark:border-gray-700/50
                  bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                  hover:bg-emerald-100 dark:hover:bg-emerald-900/30 
                  hover:border-emerald-500/60 hover:scale-105
                  transition-all duration-300 shadow-sm hover:shadow-md
                  text-2xl
                "
                aria-label="Tema değiştir"
              >
                {theme === "dark" ? "🌙" : "☀️"}
              </button>
              <div className="
                  p-2 rounded-2xl border border-gray-300/60 dark:border-gray-700/50
                  bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
                  shadow-sm flex items-center justify-center
                "
              >
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
