"use client";

import { useMemo, useState } from "react";
import { buildDraft, composeLinks, matchSkills, type SenderProfile } from "@/lib/draft";
import { loadProfile, saveProfile } from "@/lib/storage";
import type { JobInfo } from "@/lib/types";
import { inputClass, type Recipient } from "./contact-card";
import { CopyButton } from "./copy-button";

export function Composer({
  job,
  team,
  recipients,
  selectedKey,
  onSelect,
  onSent,
}: {
  job: JobInfo;
  team?: string;
  recipients: Recipient[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onSent: (recipient: Recipient) => void;
}) {
  // Composer only mounts in the browser after a lookup, so reading storage here is safe.
  const [profile, setProfile] = useState<SenderProfile>(loadProfile);
  const [override, setOverride] = useState<{ key: string; subject: string; body: string } | null>(null);

  const recipient = recipients.find((r) => r.key === selectedKey) ?? recipients[0] ?? null;
  const recipientKey = recipient?.key ?? "none";
  const skills = useMemo(
    () => matchSkills(`${job.title}\n${job.description}`, profile.resume),
    [job.title, job.description, profile.resume],
  );
  const generated = buildDraft(job, recipient?.name ?? "", recipient?.kind ?? "manager", profile, skills, team);
  const draft = override && override.key === recipientKey ? override : generated;
  const words = draft.body.trim().split(/\s+/).filter(Boolean).length;
  const links = composeLinks(recipient?.email ?? "", draft);

  function updateProfile(patch: Partial<SenderProfile>) {
    const next = { ...profile, ...patch };
    setProfile(next);
    saveProfile(next);
  }

  function edit(patch: Partial<{ subject: string; body: string }>) {
    setOverride({ key: recipientKey, subject: draft.subject, body: draft.body, ...patch });
  }

  const sent = () => {
    if (recipient) onSent(recipient);
  };

  return (
    <section id="compose" className="mt-14 scroll-mt-20">
      <h2 className="font-serif text-4xl tracking-tight">Write your email</h2>
      <p className="mt-1 text-muted">
        Fill in a little about yourself once. It&apos;s saved in this browser and reused for every job.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3 rounded-2xl border border-line bg-card p-5">
          <p className="text-[11px] font-medium tracking-wide text-faint uppercase">About you</p>
          <label className="block text-sm font-medium">
            Your name
            <input
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              placeholder="Alex Rivera"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium">
            Who you are, in one sentence
            <textarea
              value={profile.pitch}
              onChange={(e) => updateProfile({ pitch: e.target.value })}
              rows={2}
              placeholder="I'm a backend engineer with 3 years building payment systems at a fintech startup."
              className={`${inputClass} mt-1.5 h-auto py-2`}
            />
          </label>
          <label className="block text-sm font-medium">
            One result you&apos;re proud of
            <textarea
              value={profile.proof}
              onChange={(e) => updateProfile({ proof: e.target.value })}
              rows={2}
              placeholder="I cut checkout failures by 30% by rebuilding our retry logic."
              className={`${inputClass} mt-1.5 h-auto py-2`}
            />
          </label>
          <label className="block text-sm font-medium">
            Links
            <textarea
              value={profile.links}
              onChange={(e) => updateProfile({ links: e.target.value })}
              rows={2}
              placeholder={"linkedin.com/in/you\ngithub.com/you"}
              className={`${inputClass} mt-1.5 h-auto py-2`}
            />
          </label>
          <details className="rounded-xl bg-paper/70 px-3 py-2.5">
            <summary className="cursor-pointer text-sm font-medium">
              Resume text <span className="font-normal text-faint">(for skill matching)</span>
            </summary>
            <textarea
              value={profile.resume}
              onChange={(e) => updateProfile({ resume: e.target.value })}
              rows={7}
              placeholder="Paste your resume as plain text. It never leaves this browser."
              className={`${inputClass} mt-2 h-auto py-2`}
            />
          </details>

          <div className="border-t border-line pt-3">
            <p className="text-sm font-medium">Skill match</p>
            {!profile.resume.trim() ? (
              <p className="mt-1 text-xs text-muted">Paste your resume to pull matching skills into the email.</p>
            ) : skills.matched.length === 0 ? (
              <p className="mt-1 text-xs text-muted">No overlapping skills found between the posting and your resume.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.matched.map((s) => (
                  <span key={s} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {profile.resume.trim() && skills.missing.length > 0 && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                The posting also mentions: {skills.missing.slice(0, 8).join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <label htmlFor="compose-to" className="text-sm font-medium text-muted">
              To
            </label>
            {recipients.length > 0 ? (
              <select
                id="compose-to"
                value={recipient?.key}
                onChange={(e) => onSelect(e.target.value)}
                className={inputClass}
              >
                {recipients.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name} ({r.role}) &lt;{r.email}&gt;
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg bg-sun-soft px-3 py-2 text-sm">
                Add a name in any card above to address this email.
              </p>
            )}
            <label htmlFor="compose-subject" className="text-sm font-medium text-muted">
              Subject
            </label>
            <input
              id="compose-subject"
              value={draft.subject}
              onChange={(e) => edit({ subject: e.target.value })}
              className={inputClass}
            />
          </div>

          <label htmlFor="compose-body" className="sr-only">
            Email body
          </label>
          <textarea
            id="compose-body"
            value={draft.body}
            onChange={(e) => edit({ body: e.target.value })}
            rows={16}
            className={`${inputClass} mt-3 h-auto py-3 leading-relaxed`}
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={words > 150 ? "text-danger" : "text-muted"}>
              {words} words {words > 150 ? "(aim for under 150)" : ""}
            </span>
            {override && override.key === recipientKey && (
              <button
                type="button"
                onClick={() => setOverride(null)}
                className="focus-ring rounded text-muted underline underline-offset-4 hover:text-ink"
              >
                Discard edits and regenerate
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={links.gmail}
              target="_blank"
              rel="noopener noreferrer"
              onClick={sent}
              className="focus-ring rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"
            >
              Open in Gmail
            </a>
            <a
              href={links.outlook}
              target="_blank"
              rel="noopener noreferrer"
              onClick={sent}
              className="focus-ring rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-accent-strong"
            >
              Open in Outlook
            </a>
            <a
              href={links.mailto}
              onClick={sent}
              className="focus-ring rounded-xl border border-line px-4 py-2.5 text-sm font-medium transition hover:border-ink/30"
            >
              Other mail app
            </a>
            <CopyButton
              value={`Subject: ${draft.subject}\n\n${draft.body}`}
              label="Copy text"
              className="rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
          <p className="mt-3 text-xs text-faint">
            Opening a draft marks this job as emailed in your tracker. Nothing is sent until you press send in your
            mail app.
          </p>
        </div>
      </div>
    </section>
  );
}
