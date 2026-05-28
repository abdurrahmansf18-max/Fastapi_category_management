import { useEffect, useState } from "react";
import { Info, Link2, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RedirectRulesApi } from "../../shared/api/admin";
import { localizeBackendError } from "../../shared/utils/localizeError";
import type { RedirectRule } from "../../shared/types/models";
import { sectionCard } from "../utils/uiHelpers";

interface RedirectsViewProps {
  showNotification: (msg: string, type?: "error" | "success" | "warning") => void;
}

export default function RedirectsView({ showNotification }: RedirectsViewProps) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<RedirectRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourcePath, setSourcePath] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [note, setNote] = useState("");

  async function fetchRules() {
    setLoading(true);
    try {
      const rows = await RedirectRulesApi.list();
      setRules(rows);
    } catch {
      showNotification(t("redirect_list_error"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, []);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    try {
      await RedirectRulesApi.create({
        source_path: sourcePath,
        target_path: targetPath,
        status_code: statusCode,
        is_active: true,
        note: note.trim() || undefined,
      });
      setSourcePath("");
      setTargetPath("");
      setStatusCode(301);
      setNote("");
      await fetchRules();
      showNotification(t("redirect_added"), "success");
    } catch (error: any) {
      showNotification(localizeBackendError(error?.message, t) || t("redirect_add_error"), "error");
    }
  }

  async function toggleRule(rule: RedirectRule) {
    try {
      await RedirectRulesApi.update(rule.id, { is_active: !rule.is_active });
      await fetchRules();
    } catch {
      showNotification(t("redirect_update_error"), "error");
    }
  }

  async function removeRule(id: string) {
    try {
      await RedirectRulesApi.remove(id);
      await fetchRules();
      showNotification(t("redirect_deleted"), "success");
    } catch {
      showNotification(t("redirect_delete_error"), "error");
    }
  }

  return (
    <section className={sectionCard}>
      <div className="mb-5 flex items-center gap-3 text-gray-900 dark:text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
          <Link2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{t("redirects")}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("redirects_desc")}</p>
        </div>
      </div>

      {/* Kullanım notu */}
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-900/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
        <div className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
          {t("redirects_help").split("\n").map((line, i) =>
            line.startsWith("•") ? (
              <p key={i} className="mt-1 ps-2">{line}</p>
            ) : (
              <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
            )
          )}
        </div>
      </div>

      <form onSubmit={addRule} className="grid gap-3 rounded-xl border border-dashed border-gray-300/60 bg-gray-50/80 p-4 dark:border-gray-700/60 dark:bg-gray-800/50 md:grid-cols-5">
        <input
          value={sourcePath}
          onChange={(e) => setSourcePath(e.target.value)}
          placeholder="/old-path"
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 md:col-span-2"
          required
        />
        <input
          value={targetPath}
          onChange={(e) => setTargetPath(e.target.value)}
          placeholder="/new-path"
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 md:col-span-2"
          required
        />
        <select
          value={statusCode}
          onChange={(e) => setStatusCode(Number(e.target.value) as 301 | 302)}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value={301}>301 – {t("redirect_301_label")}</option>
          <option value={302}>302 – {t("redirect_302_label")}</option>
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          placeholder={t("note_optional")}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 md:col-span-4"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          {t("add_redirect")}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-gray-500">{t("loading")}</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-gray-500">{t("no_redirects")}</p>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {rule.status_code === 301 ? `301 ${t("redirect_301_label")}` : rule.status_code === 302 ? `302 ${t("redirect_302_label")}` : rule.status_code}
              </span>
              <span className="text-xs text-gray-500">{rule.source_path}</span>
              <span className="text-xs text-gray-400">→</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">{rule.target_path}</span>
              <button
                type="button"
                onClick={() => toggleRule(rule)}
                className={`ms-auto h-8 rounded-md border px-2 text-xs font-semibold ${
                  rule.is_active
                    ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    : "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {rule.is_active ? t("active") : t("inactive")}
              </button>
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:border-rose-500 hover:text-rose-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-rose-500 dark:hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

