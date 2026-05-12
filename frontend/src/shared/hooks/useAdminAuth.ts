// frontend/src/shared/hooks/useAdminAuth.ts
import { useCallback, useEffect, useState } from "react";
import { AdminAuth } from "../api/admin";
import { getAdminToken, setAdminToken } from "../api/client";

export function useAdminAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getAdminToken());
  }, []);

  useEffect(() => {
    setAdminToken(token ?? null);
  }, [token]);

  const login = useCallback(async (username: string, password: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      await AdminAuth.login(username, password);
      setTokenState("cookie-session");
      return "cookie-session";
    } catch (e: any) {
      const msg = e?.message || "Giriş başarısız.";
      setError(msg);
      setTokenState(null);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    AdminAuth.logout().catch(() => {});
    setTokenState(null);
    setAdminToken(null);
  }, []);

  return { token, loading, error, login, logout };
}
