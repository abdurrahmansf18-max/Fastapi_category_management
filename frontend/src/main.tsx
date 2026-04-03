// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./i18n";
import "./index.css";
import PublicApp from "./user/PublicApp";
import AdminApp from "./admin/AdminApp";
import { SettingsProvider } from "./shared/context/SettingsContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <SettingsProvider>
      <Routes>
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/" element={<PublicApp />} />
      </Routes>
    </SettingsProvider>
  </BrowserRouter>
);
