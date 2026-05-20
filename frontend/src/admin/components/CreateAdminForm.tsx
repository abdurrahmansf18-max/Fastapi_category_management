import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function CreateAdminForm({
  onCreate,
  showNotification,
}: {
  onCreate: (email: string, password: string) => void;
  showNotification: (m: string, t?: "error" | "success" | "warning") => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const validate = (p: string) => {

    if (p.length < 8) return t("password_rule_min_8");
    if (!/[a-z]/.test(p)) return t("password_rule_lowercase");
    if (!/[0-9]/.test(p)) return t("password_rule_number");
    return "";
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = validate(pw);
        if (v) {
          showNotification(v, "error");
          return;
        }
        onCreate(email.trim(), pw);
        setEmail("");
        setPw("");
        setErr("");
      }}
      className="mt-8 p-5 rounded-xl bg-gradient-to-br from-gray-50/80 to-gray-100/80 dark:from-gray-800/50 dark:to-gray-900/50 border border-dashed border-gray-300/60 dark:border-gray-700/60 backdrop-blur-sm"
    >
      <div className="font-semibold mb-4 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <span className="text-emerald-600 dark:text-emerald-400">+</span> {t("add_new_admin")}
      </div>
      <div className="space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("email")}
          className="w-full rounded-xl border border-gray-300/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-800/80 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
        />
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErr(validate(e.target.value));
            }}
            placeholder={t('password')}
            className={`w-full rounded-xl border ${
              err
                ? "border-red-400 dark:border-red-500 focus:ring-red-500/20 focus:border-red-500"
                : "border-gray-300/60 dark:border-gray-700/60 focus:ring-emerald-500/20 focus:border-emerald-500"
            } bg-white/90 dark:bg-gray-800/80 px-4 py-3 pr-11 text-sm`}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="submit"
          disabled={!!err || !pw || !email}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {t("add_admin")}
        </button>
      </div>
    </form>
  );
}
