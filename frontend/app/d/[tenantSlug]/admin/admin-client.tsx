"use client";

import "../../../../src/i18n";
import { useState, useEffect } from "react";
import AdminApp from "../../../../src/admin/AdminApp";
import { SettingsProvider } from "../../../../src/shared/context/SettingsContext";

export default function AdminClient({ tenantSlug }: { tenantSlug: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <SettingsProvider>
      <AdminApp tenantSlug={tenantSlug} />
    </SettingsProvider>
  );
}
