import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, Wifi, WifiOff, X } from "lucide-react";

type RealtimeEvent = {
  type: string;
  resource?: string;
  action?: string;
  title?: string | null;
  created_at?: string;
};

function wsUrlForTenant(tenantSlug: string) {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/api/t/${tenantSlug}/admin/realtime`;
}

export default function AdminRealtimeNotifications({
  tenantSlug,
  onChange,
}: {
  tenantSlug: string;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  useEffect(() => {
    if (!tenantSlug || typeof window === "undefined") return;
    let closed = false;

    const connect = () => {
      const socket = new WebSocket(wsUrlForTenant(tenantSlug));
      socketRef.current = socket;

      socket.onopen = () => setConnected(true);
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as RealtimeEvent;
          if (event.type !== "admin_change") return;
          setEvents((current) => [event, ...current].slice(0, 4));
          onChange();
        } catch {
          return;
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!closed) reconnectRef.current = window.setTimeout(connect, 3000);
      };
      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      closed = true;
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      socketRef.current?.close();
    };
  }, [onChange, tenantSlug]);

  const latest = events[0];

  return (
    <div className="fixed end-2 top-36 z-40 w-[min(22rem,calc(100vw-1rem))] space-y-2 md:end-4 md:top-20 md:w-[min(24rem,calc(100vw-2rem))]">
      <div className="ms-auto flex w-max items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-300">
        {connected ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5 text-amber-500" />}
        {connected ? t("realtime_connected") : t("realtime_reconnecting")}
      </div>

      {latest && (
        <div className="rounded-xl border border-emerald-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-emerald-800/50 dark:bg-gray-900/95">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-300">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t("content_updated_live")}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {[latest.resource, latest.action, latest.title].filter(Boolean).join(" / ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEvents([])}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label={t("close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
