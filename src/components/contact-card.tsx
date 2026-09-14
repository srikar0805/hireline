"use client";

import { useState } from "react";
import { emailGuesses, parseName } from "@/lib/email";
import { searchLinks } from "@/lib/search-links";
import type { PatternId, RoleTarget } from "@/lib/types";
import { CopyButton } from "./copy-button";

export interface ContactValue {
  name: string;
  profileUrl: string;
  /** The address the user picked from the guesses. */
  email?: string;
}

export interface Recipient {
  key: string;
  name: string;
  email: string;
  kind: "manager" | "recruiter";
  role: string;
}

export const inputClass =
  "h-10 w-full rounded-lg border border-line bg-paper/50 px-3 text-sm outline-none transition placeholder:text-faint focus:border-accent focus:bg-card";

const CONFIDENCE = {
  best: { label: "Company format", className: "bg-accent-soft text-accent" },
  common: { label: "Common format", className: "bg-sun-soft text-[#7a5a10]" },
  possible: { label: "Less likely", className: "bg-paper text-faint" },
} as const;

export function ContactCard({
  id,
  kind,
  target,
  company,
  domain,
  pattern,
  value,
  onChange,
  onWrite,
}: {
  id: string;
  kind: "manager" | "recruiter";
  target: RoleTarget;
  company: string;
  domain: string | null;
  pattern: PatternId | null;
  value: ContactValue;
  onChange: (value: ContactValue) => void;
  onWrite: (email: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const parsed = parseName(value.name);
  const guesses = parsed && domain ? emailGuesses(parsed, domain, pattern) : [];
  const visible = showAll ? guesses : guesses.slice(0, 3);

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-card p-5">
      <p className="text-[11px] font-medium tracking-wide text-faint uppercase">
        {kind === "manager" ? "Likely hiring manager" : "Likely recruiter"}
      </p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">
        {target.label}
        {kind === "manager" && target.team ? <span className="font-normal text-muted">, {target.team}</span> : null}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{target.why}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {target.titles.map((title) => (
          <span key={title} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
            {title}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs text-faint">Search public profiles at {company}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {searchLinks(company, target).map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded-lg border border-line bg-paper/60 px-3 py-1.5 text-xs font-medium transition hover:border-ink/30 hover:bg-card"
          >
            {link.label} <span aria-hidden>↗</span>
          </a>
        ))}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          Found the right person? Add their name
        </label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            id={`${id}-name`}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value, email: undefined })}
            placeholder="Full name, e.g. Maya Chen"
            autoComplete="off"
            className={inputClass}
          />
          <input
            value={value.profileUrl}
            onChange={(e) => onChange({ ...value, profileUrl: e.target.value })}
            placeholder="Profile link (optional)"
            aria-label="Profile link"
            autoComplete="off"
            className={inputClass}
          />
        </div>

        {value.name.trim() && !parsed && <p className="mt-2 text-xs text-danger">Add both a first and a last name.</p>}
        {parsed && !domain && (
          <p className="mt-2 text-xs text-muted">Add the company&apos;s email domain to see address guesses.</p>
        )}

        {guesses.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {visible.map((guess) => {
              const chosen = value.email === guess.email;
              return (
                <li
                  key={guess.email}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${chosen ? "border-accent bg-accent-soft/50" : "border-line"}`}
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{guess.email}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CONFIDENCE[guess.confidence].className}`}>
                    {CONFIDENCE[guess.confidence].label}
                  </span>
                  <CopyButton value={guess.email} />
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...value, email: guess.email });
                      onWrite(guess.email);
                    }}
                    className="focus-ring rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-paper transition hover:bg-accent-strong"
                  >
                    Write email
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {guesses.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="focus-ring mt-2 rounded text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            {showAll ? "Show fewer formats" : `Show ${guesses.length - 3} more formats`}
          </button>
        )}
        {parsed && domain && (
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(`"${parsed.display}" "@${domain}"`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-xs text-accent underline underline-offset-4"
          >
            Search the web for their published address ↗
          </a>
        )}
      </div>
    </article>
  );
}
