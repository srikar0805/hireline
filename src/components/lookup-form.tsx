"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LookupForm({ size = "lg" }: { size?: "lg" | "md" }) {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    router.push(`/find?url=${encodeURIComponent(trimmed)}`);
  }

  const tall = size === "lg";
  return (
    <div className="w-full">
      <form
        onSubmit={submit}
        className="flex w-full flex-col gap-2 rounded-2xl border border-line bg-card p-2 shadow-[0_1px_0_rgba(0,0,0,0.03),0_12px_32px_-18px_rgba(21,23,28,0.25)] sm:flex-row"
      >
        <label htmlFor="job-url" className="sr-only">
          Job posting link
        </label>
        <input
          id="job-url"
          type="url"
          inputMode="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://boards.greenhouse.io/company/jobs/123456"
          className={`min-w-0 flex-1 rounded-xl bg-transparent px-4 text-[15px] outline-none placeholder:text-faint ${tall ? "h-12" : "h-10"}`}
        />
        <button
          type="submit"
          className={`focus-ring rounded-xl bg-accent px-5 font-medium text-white transition hover:bg-accent-strong ${tall ? "h-12" : "h-10"}`}
        >
          Find the hiring team
        </button>
      </form>
      <p className="mt-3 text-sm text-muted">
        No link handy?{" "}
        <Link href="/find?manual=1" className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
          Enter the company and title instead
        </Link>
      </p>
    </div>
  );
}
