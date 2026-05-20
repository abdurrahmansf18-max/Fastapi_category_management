// frontend/src/shared/hooks/useAdminAuth.ts
import { useCallback, useEffect, useState } from "react";
import { AdminAuth } from "../api/admin";
import { getAdminToken, setAdminToken } from "../api/client";

export function useAdminAuth() {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getAdminToken());
  }, []);

  useEffect(() => {
    setAdminToken(token ?? null);
  }, [token]);

  const logout = useCallback(() => {
    AdminAuth.logout().catch(() => {});
    setTokenState(null);
    setAdminToken(null);
  }, []);

  return { token, loading: false, error: null, logout };
}
