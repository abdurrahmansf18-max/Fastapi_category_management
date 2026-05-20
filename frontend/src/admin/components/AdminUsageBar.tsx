import { useTranslation } from "react-i18next";
import { Users, FolderOpen, BookOpen, FileText, Cpu, Image } from "lucide-react";

type UsagePayload = {
  usage?: Record<string, number>;
  limits?: Record<string, number>;
};

function fmtBytes(value: number | undefined) {
  const bytes = value || 0;
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${Math.round(bytes / 1048576)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const STATS = [
  { key: "admins",    labelKey: "admins",       Icon: Users,      grad: "from-sky-500 to-blue-500" },
  { key: "categories",labelKey: "categories",   Icon: FolderOpen, grad: "from-violet-500 to-purple-500" },
  { key: "headings",  labelKey: "headings",      Icon: BookOpen,   grad: "from-emerald-500 to-teal-500" },
  { key: "contents",  labelKey: "contents",      Icon: FileText,   grad: "from-amber-500 to-orange-500" },
  { key: "ai",        labelKey: "ai_monthly",    Icon: Cpu,        grad: "from-rose-500 to-pink-500" },
  { key: "upload",    labelKey: "upload_image",  Icon: Image,      grad: "from-cyan-500 to-sky-500", isByte: true },
];

export default function AdminUsageBar({ usage }: { usage: UsagePayload | null }) {
  const { t } = useTranslation();
  if (!usage) return null;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {STATS.map(({ key, labelKey, Icon, grad, isByte }) => {
        const raw = key === "ai" ? usage.usage?.ai_monthly : usage.usage?.[key];
        const display = isByte ? fmtBytes(raw) : String(Number(raw) || 0);

        return (
          <div key={key} className="item-card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${grad} shadow-sm`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{display}</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t(labelKey)}
            </p>
            <div className={`h-0.5 rounded-full bg-gradient-to-r ${grad} opacity-50`} />
          </div>
        );
      })}
    </section>
  );
}
