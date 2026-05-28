import { useTranslation } from "react-i18next";
import { BarChart3, Bell, FileText, FolderTree, Heading2, Link2, Users } from "lucide-react";
import { cx } from "../utils/uiHelpers";

export type AdminMobileSection =
  | "overview"
  | "categories"
  | "headings"
  | "contents"
  | "admins"
  | "redirects"
  | "notifications";

const tabs = [
  ["overview", "dashboard", BarChart3],
  ["categories", "categories", FolderTree],
  ["headings", "headings", Heading2],
  ["contents", "contents", FileText],
  ["admins", "admins", Users],
  ["redirects", "redirects", Link2],
  ["notifications", "notifications", Bell],
] as const;

export default function AdminBottomNav({
  activeSection,
  onSelect,
}: {
  activeSection: AdminMobileSection;
  onSelect: (section: AdminMobileSection) => void;
}) {
  const { t } = useTranslation();

  return (
    <nav className="sticky top-16 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 [&::-webkit-scrollbar]:hidden" style={{WebkitOverflowScrolling:"touch"}}>
        {tabs.map(([section, key, Icon]) => {
          const selected = activeSection === section;
          return (
            <button
              key={section}
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelect(section)}
              className={cx(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition-colors",
                selected
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/70 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="whitespace-nowrap">{t(key)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
