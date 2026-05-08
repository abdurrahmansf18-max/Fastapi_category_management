// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import "./i18n";
import "./index.css";
import PublicApp from "./user/PublicApp";
import AdminApp from "./admin/AdminApp";
import { SettingsProvider } from "./shared/context/SettingsContext";
import SignupApp from "./SignupApp";
import VerifyEmailApp from "./VerifyEmailApp";

function TenantSettings({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <section className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold">Docs Platform</h1>
        <p className="mt-4 text-gray-300">
          Create a public documentation workspace and manage it from your own admin panel.
        </p>
        <Link
          to="/signup"
          className="mt-8 inline-block rounded-xl bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500"
        >
          Create workspace
        </Link>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignupApp />} />
      <Route path="/verify-email" element={<VerifyEmailApp />} />
      <Route
        path="/d/:tenantSlug/admin/*"
        element={
          <TenantSettings>
            <AdminApp />
          </TenantSettings>
        }
      />
      <Route
        path="/d/:tenantSlug/*"
        element={
          <TenantSettings>
            <PublicApp />
          </TenantSettings>
        }
      />
      <Route path="/admin" element={<Navigate to="/signup" replace />} />
    </Routes>
  </BrowserRouter>
);
