"use client";

import { useState } from "react";
import { MessageSquare, ThumbsDown, ThumbsUp } from "lucide-react";

const copy = {
  tr: {
    title: "Bu sayfa yardımcı oldu mu?",
    helpful: "Evet",
    notHelpful: "Hayır",
    placeholder: "Kısa not ekle",
    send: "Gönder",
    thanks: "Geri bildirimin için teşekkürler.",
  },
  en: {
    title: "Was this page helpful?",
    helpful: "Yes",
    notHelpful: "No",
    placeholder: "Add a short note",
    send: "Send",
    thanks: "Thanks for the feedback.",
  },
  ar: {
    title: "هل كانت هذه الصفحة مفيدة؟",
    helpful: "نعم",
    notHelpful: "لا",
    placeholder: "أضف ملاحظة قصيرة",
    send: "إرسال",
    thanks: "شكراً على ملاحظتك.",
  },
};

function currentLanguage(): keyof typeof copy {
  if (typeof window === "undefined") return "tr";
  const saved = window.localStorage.getItem("appLanguage");
  if (saved === "tr" || saved === "en" || saved === "ar") return saved;
  const lang = window.navigator.language.toLowerCase();
  if (lang.startsWith("ar")) return "ar";
  if (lang.startsWith("en")) return "en";
  return "tr";
}

export default function PublicFeedbackWidget({ tenantSlug }: { tenantSlug: string }) {
  const [rating, setRating] = useState<"helpful" | "not_helpful" | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const labels = copy[currentLanguage()];

  const send = async (nextRating = rating) => {
    if (!nextRating) return;
    await fetch(`/api/t/${encodeURIComponent(tenantSlug)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        rating: nextRating,
        message: message.trim() || null,
        url: window.location.pathname,
      }),
    });
    setSent(true);
  };

  if (sent) {
    return (
      <aside className="mt-10 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        {labels.thanks}
      </aside>
    );
  }

  return (
    <aside className="mt-10 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <MessageSquare className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
        {labels.title}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setRating("helpful");
            send("helpful").catch(() => {});
          }}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:border-emerald-600 dark:border-gray-700 dark:bg-gray-950"
        >
          <ThumbsUp className="h-4 w-4" />
          {labels.helpful}
        </button>
        <button
          type="button"
          onClick={() => setRating("not_helpful")}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:border-amber-600 dark:border-gray-700 dark:bg-gray-950"
        >
          <ThumbsDown className="h-4 w-4" />
          {labels.notHelpful}
        </button>
      </div>
      {rating === "not_helpful" && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={labels.placeholder}
            className="min-h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-950"
          />
          <button
            type="button"
            onClick={() => send().catch(() => {})}
            className="min-h-10 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {labels.send}
          </button>
        </div>
      )}
    </aside>
  );
}
