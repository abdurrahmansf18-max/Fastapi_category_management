import { useTranslation } from "react-i18next";
import { FileText, FolderTree, Heading2, Link2, Users } from "lucide-react";
import { Globe2 } from "lucide-react";

const links = [
  ["#admin-categories", "categories", FolderTree],
  ["#admin-headings", "headings", Heading2],
  ["#admin-contents", "contents", FileText],
  ["#admin-users", "admins", Users],
  ["#admin-redirects", "redirects", Link2],
] as const;

export default function AdminBottomNav({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] text-xs font-semibold text-gray-700 shadow-2xl backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-950/95 dark:text-gray-200">
      {links.map(([href, key, Icon]) => (
        <a key={href} className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2" href={href}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-full truncate">{t(key)}</span>
        </a>
      ))}
      <a
        href={`/d/${tenantSlug}`}
        className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-emerald-600 dark:text-emerald-400"
      >
        <Globe2 className="h-4 w-4" aria-hidden="true" />
        <span className="max-w-full truncate">{t("public_site")}</span>
      </a>
    </nav>
  );
}
