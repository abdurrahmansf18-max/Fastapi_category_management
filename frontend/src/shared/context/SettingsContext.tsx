import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PublicApi } from "../api/public";

interface SettingsContextVal {
  siteTitle: string;
  siteLogo: string;
  loading: boolean;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextVal | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const [siteTitle, setSiteTitle] = useState("Fastapi");
  const [siteLogo, setSiteLogo] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await PublicApi.settings();
      if (res) {
        setSiteTitle(res.site_title || "Fastapi");
        setSiteLogo(res.site_logo || "");
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
  }, [location.pathname]);

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
