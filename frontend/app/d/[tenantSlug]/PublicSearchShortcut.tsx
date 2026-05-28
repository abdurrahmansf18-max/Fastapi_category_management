"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

export default function PublicSearchShortcut({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const commandSearch = (event.ctrlKey || event.metaKey) && key === "k";
      const slashSearch = key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;
      if (!commandSearch && !slashSearch) return;
      if (slashSearch && isTypingTarget(event.target)) return;

      event.preventDefault();
      router.push(`/d/${tenantSlug}/search`);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, tenantSlug]);

  return null;
}
