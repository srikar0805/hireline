"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  LEAD_STATUSES,
  getLeadsSnapshot,
  getServerLeadsSnapshot,
  removeLead,
  subscribeLeads,
  updateLead,
  type Lead,
  type LeadStatus,
} from "@/lib/storage";
import { CopyButton } from "./copy-button";
import { inputClass } from "./contact-card";

const FOLLOW_UP_AFTER_DAYS = 5;
const DAY_MS = 86_400_000;

function followUpDue(lead: Lead, now: number): boolean {
  return lead.status === "emailed" && !!lead.emailedAt && now - Date.parse(lead.emailedAt) > FOLLOW_UP_AFTER_DAYS * DAY_MS;
}

function followUpNote(lead: Lead): string {
  const firstName = lead.contacts[0]?.name.split(" ")[0] ?? "there";
  return `Hi ${firstName},

I wanted to follow up on my note about the ${lead.title} role at ${lead.company}. I'm still very interested and would welcome a quick chat if the timing works on your end.

Thanks again for your time,`;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function exportCsv(leads: Lead[]) {
  const header = ["company", "title", "status", "saved_at", "emailed_at", "contacts", "emails", "job_url", "notes"];
  const rows = leads.map((l) => [
    l.company,
    l.title,
    l.status,
    l.savedAt,
    l.emailedAt ?? "",
    l.contacts.map((c) => `${c.name} (${c.role})`).join("; "),
    l.contacts.map((c) => c.email ?? "").filter(Boolean).join("; "),
    l.jobUrl,
    l.notes,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = href;
  a.download = `hireline-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(href);
}

export function TrackerBoard() {
  const leads = useSyncExternalStore(subscribeLeads, getLeadsSnapshot, getServerLeadsSnapshot);
  const [filter, setFilter] = useState<LeadStatus | "all" | "due">("all");
  const [now] = useState(() => Date.now());

  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s.id, leads.filter((l) => l.status === s.id).length]));
  const dueCount = leads.filter((l) => followUpDue(l, now)).length;
  const visible = leads.filter((l) =>
    filter === "all" ? true : filter === "due" ? followUpDue(l, now) : l.status === filter,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Outreach tracker</h1>
          <p className="mt-2 text-muted">Saved in this browser only. Export a CSV to back it up.</p>
        </div>
        {leads.length > 0 && (
          <button
            type="button"
            onClick={() => exportCsv(leads)}
            className="focus-ring rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium hover:border-ink/30"
          >
            Export CSV
          </button>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="font-medium">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted">Look up a job and press Save to tracker, or open an email draft.</p>
          <Link
            href="/find"
            className="focus-ring mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Find a hiring team
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={leads.length} />
            {dueCount > 0 && (
              <FilterChip active={filter === "due"} onClick={() => setFilter("due")} label="Follow-up due" count={dueCount} highlight />
            )}
            {LEAD_STATUSES.map((s) => (
              <FilterChip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)} label={s.label} count={counts[s.id]} />
            ))}
          </div>

          <ul className="mt-6 space-y-4">
            {visible.map((lead) => (
              <LeadRow key={lead.id} lead={lead} due={followUpDue(lead, now)} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  highlight = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`focus-ring rounded-full border px-3 py-1.5 text-sm transition ${
        active ? "border-ink bg-ink text-paper" : highlight ? "border-sun bg-sun-soft" : "border-line bg-card text-muted hover:text-ink"
      }`}
    >
      {label} <span className={active ? "text-paper/60" : "text-faint"}>{count}</span>
    </button>
  );
}

function LeadRow({ lead, due }: { lead: Lead; due: boolean }) {
  const [notes, setNotes] = useState(lead.notes);

  return (
    <li className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{lead.company}</p>
          <h2 className="text-lg font-semibold tracking-tight">{lead.title}</h2>
          <p className="mt-1 text-xs text-faint">
            Saved {new Date(lead.savedAt).toLocaleDateString()}
            {lead.emailedAt ? ` · Emailed ${new Date(lead.emailedAt).toLocaleDateString()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {due && (
            <span className="rounded-full bg-sun-soft px-2.5 py-1 text-xs font-medium text-[#7a5a10]">Follow-up due</span>
          )}
          <label htmlFor={`${lead.id}-status`} className="sr-only">
            Status
          </label>
          <select
            id={`${lead.id}-status`}
            value={lead.status}
            onChange={(e) => {
              const status = e.target.value as LeadStatus;
              updateLead(lead.id, {
                status,
                emailedAt: status === "emailed" && !lead.emailedAt ? new Date().toISOString() : lead.emailedAt,
              });
            }}
            className={`${inputClass} w-auto`}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {lead.contacts.length > 0 && (
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {lead.contacts.map((c) => (
            <li key={`${c.name}-${c.role}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="text-muted">{c.role}</span>
              {c.email && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{c.email}</span>
                  <CopyButton value={c.email} />
                </span>
              )}
              {c.profileUrl && /^https?:\/\//.test(c.profileUrl) && (
                <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent underline">
                  Profile ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <label htmlFor={`${lead.id}-notes`} className="sr-only">
        Notes
      </label>
      <textarea
        id={`${lead.id}-notes`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== lead.notes && updateLead(lead.id, { notes })}
        rows={2}
        placeholder="Notes: who replied, next steps, interview dates..."
        className={`${inputClass} mt-4 h-auto py-2`}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {lead.jobUrl && (
          <>
            <a
              href={lead.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
            >
              Posting ↗
            </a>
            <Link
              href={`/find?url=${encodeURIComponent(lead.jobUrl)}`}
              className="focus-ring rounded-md border border-line px-2.5 py-1 text-xs font-medium text-muted hover:text-ink"
            >
              Look up again
            </Link>
          </>
        )}
        <CopyButton value={followUpNote(lead)} label="Copy follow-up note" />
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Remove ${lead.title} at ${lead.company} from your tracker?`)) removeLead(lead.id);
          }}
          className="focus-ring ml-auto rounded-md px-2.5 py-1 text-xs text-danger hover:bg-danger/5"
        >
          Remove
        </button>
      </div>
    </li>
  );
}
