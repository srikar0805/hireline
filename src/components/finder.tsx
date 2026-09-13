"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { describePattern, emailGuesses, parseName } from "@/lib/email";
import { leadId, loadLeads, upsertLead, type Lead, type LeadContact } from "@/lib/storage";
import type { CompanyInfo, JobInfo, JobSource, LookupResult } from "@/lib/types";
import { Composer } from "./composer";
import { ContactCard, inputClass, type ContactValue, type Recipient } from "./contact-card";

const SOURCE_LABEL: Record<JobSource, string> = {
  greenhouse: "Greenhouse API",
  lever: "Lever API",
  ashby: "Ashby API",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters API",
  jsonld: "Job page data",
  meta: "Job page",
  manual: "Entered manually",
};

const LOADING_STEPS = [
  "Reading the job posting",
  "Finding the company's domain",
  "Checking its mail servers",
  "Scanning its public pages for an email format",
];

type LookupResponse = { ok: true; data: LookupResult } | { ok: false; error: string; status: number };

async function requestLookup(payload: Record<string, string>): Promise<LookupResponse> {
  try {
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? "Lookup failed.", status: res.status };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again.", status: 0 };
  }
}

export function Finder({ initialUrl = "", startManual = false }: { initialUrl?: string; startManual?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [showManual, setShowManual] = useState(startManual);
  const [manual, setManual] = useState({ title: "", company: "", description: "" });
  const [loading, setLoading] = useState(Boolean(initialUrl));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [contacts, setContacts] = useState<Record<string, ContactValue>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const started = useRef(false);

  function applyResponse(response: LookupResponse) {
    setLoading(false);
    if (!response.ok) {
      setError(response.error);
      setResult(null);
      if (response.status === 422) setShowManual(true);
      return;
    }
    const { job } = response.data;
    const id = leadId(job.url, job.company, job.title);
    setError(null);
    setResult(response.data);
    setContacts({});
    setSelectedKey(null);
    setSavedId(loadLeads().some((l) => l.id === id) ? id : null);
  }

  const onInitialResponse = useEffectEvent((response: LookupResponse) => applyResponse(response));

  useEffect(() => {
    if (!initialUrl || started.current) return;
    started.current = true;
    requestLookup({ url: initialUrl }).then(onInitialResponse);
  }, [initialUrl]);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 1500);
    return () => clearInterval(timer);
  }, [loading]);

  function start(payload: Record<string, string>) {
    setLoading(true);
    setStep(0);
    setError(null);
    requestLookup(payload).then(applyResponse);
  }

  function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    router.replace(`/find?url=${encodeURIComponent(trimmed)}`, { scroll: false });
    start({ url: trimmed });
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    start({ ...manual, url: url.trim() });
  }

  const targets = result
    ? [
        ...result.team.hiringManagers.map((target, i) => ({ key: `manager-${i}`, kind: "manager" as const, target })),
        ...result.team.recruiters.map((target, i) => ({ key: `recruiter-${i}`, kind: "recruiter" as const, target })),
      ]
    : [];

  const recipients: Recipient[] = targets.flatMap(({ key, kind, target }) => {
    const contact = contacts[key];
    const parsed = contact ? parseName(contact.name) : null;
    const domain = result?.company.domain;
    if (!contact || !parsed || !domain) return [];
    const email = contact.email ?? emailGuesses(parsed, domain, result.company.evidence.pattern)[0].email;
    return [{ key, name: parsed.display, email, kind, role: target.label }];
  });

  function saveLead(emailed?: Recipient) {
    if (!result) return;
    const { job, company } = result;
    const id = leadId(job.url, job.company, job.title);
    const existing = loadLeads().find((l) => l.id === id);
    const fresh: LeadContact[] = recipients.map((r) => ({
      name: r.name,
      role: r.role,
      kind: r.kind,
      email: r.email,
      profileUrl: contacts[r.key]?.profileUrl || undefined,
    }));
    const merged = [...fresh, ...(existing?.contacts ?? []).filter((c) => !fresh.some((f) => f.name === c.name))];
    const lead: Lead = {
      id,
      savedAt: existing?.savedAt ?? new Date().toISOString(),
      jobUrl: job.url,
      title: job.title,
      company: job.company,
      domain: company.domain,
      contacts: merged,
      status: emailed && (!existing || existing.status === "saved") ? "emailed" : (existing?.status ?? "saved"),
      notes: existing?.notes ?? "",
      emailedAt: emailed ? new Date().toISOString() : existing?.emailedAt,
    };
    upsertLead(lead);
    setSavedId(id);
  }

  function writeTo(key: string) {
    setSelectedKey(key);
    requestAnimationFrame(() => document.getElementById("compose")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-10 sm:px-8">
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Find the hiring team</h1>
      <p className="mt-2 text-muted">Paste a job link. Everything runs on public data and stays in your browser.</p>

      <form onSubmit={submitUrl} className="mt-6 flex flex-col gap-2 rounded-2xl border border-line bg-card p-2 sm:flex-row">
        <label htmlFor="finder-url" className="sr-only">
          Job posting link
        </label>
        <input
          id="finder-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a job link from Greenhouse, Lever, Ashby, Workday, LinkedIn..."
          className="h-11 min-w-0 flex-1 rounded-xl bg-transparent px-4 text-[15px] outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="focus-ring h-11 rounded-xl bg-accent px-5 font-medium text-white transition hover:bg-accent-strong disabled:opacity-50"
        >
          {loading ? "Looking up..." : "Find the hiring team"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setShowManual((s) => !s)}
        className="focus-ring mt-3 rounded text-sm text-muted underline underline-offset-4 hover:text-ink"
      >
        {showManual ? "Hide manual entry" : "No link, or the site won't load? Enter it manually"}
      </button>

      {showManual && (
        <form onSubmit={submitManual} className="mt-4 grid gap-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Company
            <input
              required
              value={manual.company}
              onChange={(e) => setManual({ ...manual, company: e.target.value })}
              placeholder="Stripe"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="text-sm font-medium">
            Job title
            <input
              required
              value={manual.title}
              onChange={(e) => setManual({ ...manual, title: e.target.value })}
              placeholder="Software Engineer, Payments"
              className={`${inputClass} mt-1.5`}
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Job description <span className="font-normal text-faint">(optional, improves skill matching)</span>
            <textarea
              value={manual.description}
              onChange={(e) => setManual({ ...manual, description: e.target.value })}
              rows={4}
              className={`${inputClass} mt-1.5 h-auto py-2`}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="focus-ring rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-accent-strong disabled:opacity-50"
            >
              Find the hiring team
            </button>
          </div>
        </form>
      )}

      {error && !loading && (
        <div role="alert" className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && <LoadingPanel step={step} />}

      {!loading && !result && !error && <EmptyState />}

      {!loading && result && (
        <>
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <JobCard job={result.job} saved={savedId !== null} onSave={() => saveLead()} />
              <TeamSection title="Hiring managers" subtitle="The people who own the team this role joins.">
                {targets
                  .filter((t) => t.kind === "manager")
                  .map(({ key, kind, target }) => (
                    <ContactCard
                      key={key}
                      id={key}
                      kind={kind}
                      target={target}
                      company={result.job.company}
                      domain={result.company.domain}
                      pattern={result.company.evidence.pattern}
                      value={contacts[key] ?? { name: "", profileUrl: "" }}
                      onChange={(value) => setContacts((c) => ({ ...c, [key]: value }))}
                      onWrite={() => writeTo(key)}
                    />
                  ))}
              </TeamSection>
              <TeamSection title="Recruiters" subtitle="The people screening applicants for this opening.">
                {targets
                  .filter((t) => t.kind === "recruiter")
                  .map(({ key, kind, target }) => (
                    <ContactCard
                      key={key}
                      id={key}
                      kind={kind}
                      target={target}
                      company={result.job.company}
                      domain={result.company.domain}
                      pattern={result.company.evidence.pattern}
                      value={contacts[key] ?? { name: "", profileUrl: "" }}
                      onChange={(value) => setContacts((c) => ({ ...c, [key]: value }))}
                      onWrite={() => writeTo(key)}
                    />
                  ))}
              </TeamSection>
            </div>
            <CompanyCard
              key={result.company.domain ?? "none"}
              company={result.company}
              companyName={result.job.company}
              onUpdate={(company) => setResult((r) => (r ? { ...r, company } : r))}
            />
          </div>

          <Composer
            job={result.job}
            team={result.team.hiringManagers[0]?.team}
            recipients={recipients}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onSent={(r) => saveLead(r)}
          />
        </>
      )}
    </div>
  );
}

function LoadingPanel({ step }: { step: number }) {
  return (
    <div aria-live="polite" className="mt-8 rounded-2xl border border-line bg-card p-6">
      <ol className="space-y-3">
        {LOADING_STEPS.map((label, i) => (
          <li key={label} className={`flex items-center gap-3 text-sm ${i <= step ? "text-ink" : "text-faint"}`}>
            <span
              className={`grid size-5 place-items-center rounded-full text-[11px] ${i < step ? "bg-accent text-white" : i === step ? "animate-pulse bg-sun-soft text-ink" : "bg-paper"}`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {[
        ["Official job board APIs", "Greenhouse, Lever, Ashby, Workday and SmartRecruiters links are read directly."],
        ["Real email formats", "We look for real addresses on the company's own site to learn its format."],
        ["Your inbox, your data", "Emails open in Gmail or Outlook. Your tracker lives in this browser."],
      ].map(([title, body]) => (
        <div key={title} className="rounded-2xl border border-dashed border-line p-5">
          <p className="font-medium">{title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
        </div>
      ))}
    </div>
  );
}

function TeamSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="hidden text-sm text-faint sm:block">{subtitle}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

function JobCard({ job, saved, onSave }: { job: JobInfo; saved: boolean; onSave: () => void }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent">
            {SOURCE_LABEL[job.source]}
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">{job.title}</h2>
          <p className="mt-1 text-muted">{[job.company, job.department, job.location].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex items-center gap-2">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-ink/30"
            >
              View posting ↗
            </a>
          )}
          {saved ? (
            <Link href="/tracker" className="focus-ring rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
              Saved · Open tracker
            </Link>
          ) : (
            <button
              type="button"
              onClick={onSave}
              className="focus-ring rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper hover:bg-accent-strong"
            >
              Save to tracker
            </button>
          )}
        </div>
      </div>
      {job.reportsTo && (
        <p className="mt-5 rounded-xl bg-sun-soft px-4 py-3 text-sm">
          The posting says this role reports to <strong>{job.reportsTo}</strong>. Search for that title first.
        </p>
      )}
      {job.description && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">Show posting text</summary>
          <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-line leading-relaxed text-muted">
            {job.description}
          </p>
        </details>
      )}
    </section>
  );
}

const DOMAIN_SOURCE: Record<NonNullable<CompanyInfo["domainSource"]>, string> = {
  posting: "Taken from the job posting",
  guess: "Best guess from the company name. Please confirm.",
  user: "Entered by you",
};

function CompanyCard({
  company,
  companyName,
  onUpdate,
}: {
  company: CompanyInfo;
  companyName: string;
  onUpdate: (company: CompanyInfo) => void;
}) {
  const [domain, setDomain] = useState(company.domain ?? "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { evidence } = company;

  async function recheck(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, company: companyName }),
      });
      const data = await res.json();
      if (res.ok) onUpdate(data);
      else setError(data.error ?? "Couldn't check that domain.");
    } catch {
      setError("Network error.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <aside className="rounded-2xl border border-line bg-card p-5 lg:sticky lg:top-20">
      <p className="text-[11px] font-medium tracking-wide text-faint uppercase">Company email</p>
      <form onSubmit={recheck} className="mt-3 flex gap-2">
        <label htmlFor="company-domain" className="sr-only">
          Company email domain
        </label>
        <input
          id="company-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="company.com"
          className={`${inputClass} font-mono`}
        />
        <button
          type="submit"
          disabled={checking || !domain.trim()}
          className="focus-ring shrink-0 rounded-lg border border-line px-3 text-sm font-medium hover:border-ink/30 disabled:opacity-50"
        >
          {checking ? "Checking" : "Check"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {company.domainSource && <p className="mt-2 text-xs text-muted">{DOMAIN_SOURCE[company.domainSource]}</p>}

      {!company.domain ? (
        <p className="mt-4 rounded-xl bg-sun-soft px-3.5 py-3 text-sm">
          We couldn&apos;t find a domain that receives email for {companyName}. Enter the company&apos;s website domain above.
        </p>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          <Row label="Mail server">
            {company.hasMx ? (
              <span className="text-accent">{company.mailProvider ?? "Found"}</span>
            ) : (
              <span className="text-danger">None found</span>
            )}
          </Row>
          <Row label="Email format">
            {evidence.pattern ? (
              <span className="font-mono">
                {describePattern(evidence.pattern)}@{company.domain}
              </span>
            ) : (
              <span className="text-muted">Not confirmed</span>
            )}
          </Row>
          <p className="rounded-xl bg-paper px-3.5 py-3 leading-relaxed text-muted">
            {!company.hasMx
              ? "This domain doesn't accept email. Double-check the domain before guessing addresses."
              : evidence.pattern
                ? `Based on ${evidence.samples.length} real address${evidence.samples.length === 1 ? "" : "es"} published on ${company.domain}. Guesses in this format are ranked first.`
                : evidence.samples.length
                  ? "We found addresses on the site, but none reveal the naming format. Guesses are ranked by how common each format is."
                  : `We scanned ${evidence.pagesScanned} public page${evidence.pagesScanned === 1 ? "" : "s"} and found no personal addresses. Guesses are ranked by how common each format is.`}
          </p>
          {evidence.samples.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs text-muted hover:text-ink">Addresses found on the site</summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-muted">
                {evidence.samples.map((s) => (
                  <li key={s} className="truncate">
                    {s}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="border-t border-line pt-3 text-xs leading-relaxed text-muted">
            <p className="font-medium text-ink">Before you send</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Search the person&apos;s name with &quot;@{company.domain}&quot;. Talks, papers and GitHub often show real work addresses.</li>
              {company.mailProvider === "Google Workspace" && (
                <li>Paste a guess into a new Gmail message. For Google Workspace companies, a real account sometimes shows a name or photo on hover.</li>
              )}
              <li>Send to one address only. If it bounces, try the next format.</li>
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}
