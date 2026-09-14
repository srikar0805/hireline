"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  className = "",
  onCopied,
}: {
  value: string;
  label?: string;
  className?: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the value is still visible to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`focus-ring rounded-md border border-line bg-card px-2.5 py-1 text-xs font-medium text-muted transition hover:border-ink/30 hover:text-ink ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
