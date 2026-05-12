import { useTranslation } from "react-i18next";
import { KeyRound, Trash2, Users } from "lucide-react";
import { itemCard, sectionCard } from "../utils/uiHelpers";
import CreateAdminForm from "../components/CreateAdminForm";
import type { AdminUser, UUID } from "../../shared/types/models";

interface AdminUsersViewProps {
  admins: AdminUser[];
  changeAdminPassword: (id: UUID) => void;
  deleteAdmin: (id: UUID) => void;
  createAdmin: (email: string, password: string) => Promise<void>;
  showNotification: (msg: string, type?: "error" | "success" | "warning") => void;
}

export default function AdminUsersView({
  admins,
  changeAdminPassword,
  deleteAdmin,
  createAdmin,
  showNotification,
}: AdminUsersViewProps) {
  const { t } = useTranslation();

  return (
    <section className={sectionCard}>
      <div className="relative z-10">
        <div className="font-bold mb-8 text-2xl flex items-center gap-4 text-gray-900 dark:text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-700 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2>{t("admin_users")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
              {t("admin_users_desc")}
            </p>
          </div>
        </div>

        {admins.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Users className="mx-auto mb-4 h-12 w-12" />
            <p className="text-lg font-medium">{t("no_admin_yet")}</p>
            <p className="text-sm">{t("create_first_admin")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {admins.map((a) => (
              <div key={a.id} className={itemCard}>
                <div className="flex items-center justify-between gap-4">
                  <div className="font-bold text-left flex-1 truncate text-lg text-gray-800 dark:text-gray-200">
                    {a.email}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-emerald-600/80 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 hover:scale-105 transition-all duration-200"
                      onClick={() => changeAdminPassword(a.id)}
                      title={t("change_password")}
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>

                    <button
                      className="p-3 rounded-xl border border-gray-300/60 dark:border-gray-600/60 hover:border-rose-400/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:scale-105 transition-all duration-200"
                      onClick={() => deleteAdmin(a.id)}
                      title={t('delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <CreateAdminForm
            onCreate={createAdmin}
            showNotification={showNotification}
          />
        </div>
      </div>
    </section>
  );
}
