import React, { createContext, useContext, useEffect, useState } from "react";
import { PublicApi } from "../api/public";

function toPublicUrl(url: string): string {
  const m = url.match(/^https?:\/\/[^/]+(:\d+)?(\/api\/.+)$/);
  return m ? m[2] : url;
}

interface SettingsContextVal {
  siteTitle: string;
  siteLogo: string;
  loading: boolean;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextVal | null>(null);

function titleFromCurrentTenant() {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(/^\/d\/([^/]+)/);
  const slug = match ? decodeURIComponent(match[1]) : "";
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [siteTitle, setSiteTitle] = useState(titleFromCurrentTenant);
  const [siteLogo, setSiteLogo] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await PublicApi.settings();
      if (res) {
        setSiteTitle(res.site_title || titleFromCurrentTenant());
        setSiteLogo(res.site_logo ? toPublicUrl(res.site_logo) : "");
      }
    } catch (error) {
      console.error("Failed to load site settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ siteTitle, siteLogo, loading, reload: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be within SettingsProvider");
  return ctx;
};
