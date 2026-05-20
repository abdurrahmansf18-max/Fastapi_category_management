"use client";
import dynamic from "next/dynamic";

// Client-only: react-i18next reads browser locale, which differs from SSR default.
// `ssr: false` prevents the server/client language mismatch hydration error.
const HomeClient = dynamic(() => import("./HomeClient"), { ssr: false });

export default function Page() {
  return <HomeClient />;
}
