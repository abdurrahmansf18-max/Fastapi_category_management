"use client";

import { useState, type ReactNode } from "react";

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textFromNode((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

export default function MarkdownPre({
  children,
  copyLabel,
  copiedLabel,
  className,
}: {
  children: ReactNode;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(textFromNode(children).replace(/\n$/, ""));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="group relative my-6">
      <button
        type="button"
        onClick={copyCode}
        className="absolute end-2 top-2 z-10 rounded-md border border-slate-300 bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 opacity-100 shadow-sm transition hover:bg-emerald-600 hover:border-emerald-600 hover:text-white dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-emerald-700 dark:hover:border-emerald-700 dark:hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
      <pre className={className}>{children}</pre>
    </div>
  );
}
