"use client";

import "../../../../src/i18n";
import AdminApp from "../../../../src/admin/AdminApp";
import { SettingsProvider } from "../../../../src/shared/context/SettingsContext";

export default function AdminClient({ tenantSlug }: { tenantSlug: string }) {
  return (
    <SettingsProvider>
      <AdminApp tenantSlug={tenantSlug} />
    </SettingsProvider>
  );
}
