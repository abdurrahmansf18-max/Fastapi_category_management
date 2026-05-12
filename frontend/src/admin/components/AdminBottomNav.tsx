import { useTranslation } from "react-i18next";
import { FileText, FolderTree, Heading2, Users } from "lucide-react";

const links = [
  ["#admin-categories", "categories", FolderTree],
  ["#admin-headings", "headings", Heading2],
  ["#admin-contents", "contents", FileText],
  ["#admin-users", "admins", Users],
] as const;

export default function AdminBottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-gray-200 bg-white/95 text-xs font-semibold text-gray-700 shadow-2xl backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-950/95 dark:text-gray-200">
      {links.map(([href, key, Icon]) => (
        <a key={href} className="flex min-h-14 flex-col items-center justify-center gap-1 px-2" href={href}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-full truncate">{t(key)}</span>
        </a>
      ))}
    </nav>
  );
}
