import "server-only";
import { isJobBoardHost, registrableDomain } from "@/lib/domain";
import type { JobInfo } from "@/lib/types";
import { htmlToText, jsonLdNodes, metaContent, titleTag, type LdNode } from "./html";
import { FetchError, fetchJson, safeFetch } from "./safe-fetch";

type ParsedJob = Omit<JobInfo, "url" | "reportsTo">;

const titleCase = (slug: string) =>
  slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

function domainFromUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const host = new URL(value).hostname;
    return isJobBoardHost(host) ? undefined : registrableDomain(host);
  } catch {
    return undefined;
  }
}

export function findReportsTo(text: string): string | undefined {
  const m = text.match(
    /\breport(?:s|ing)? (?:directly )?(?:in)?to (?:the |our |a )?([A-Z][A-Za-z&/, -]{2,60}?)(?=[.;:\n(]| and | who | on | based | in )/,
  );
  return m?.[1].replace(/[ ,-]+$/, "").trim() || undefined;
}

// Greenhouse ----------------------------------------------------------------

interface GreenhouseJob {
  title: string;
  company_name?: string;
  absolute_url?: string;
  content?: string;
  location?: { name?: string };
  departments?: { name?: string }[];
}

async function fromGreenhouse(board: string, id: string): Promise<ParsedJob | null> {
  const job = await fetchJson<GreenhouseJob>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(id)}`,
  );
  if (!job?.title) return null;
  return {
    source: "greenhouse",
    title: job.title,
    company: job.company_name || titleCase(board),
    location: job.location?.name,
    department: job.departments?.[0]?.name?.replace(/^\d+\s+/, ""),
    description: htmlToText(job.content ?? ""),
    domainHint: domainFromUrl(job.absolute_url),
  };
}

// Lever ---------------------------------------------------------------------

interface LeverJob {
  text: string;
  hostedUrl?: string;
  descriptionPlain?: string;
  additionalPlain?: string;
  lists?: { text: string; content: string }[];
  categories?: { team?: string; department?: string; location?: string };
}

async function fromLever(url: URL, company: string, id: string): Promise<ParsedJob | null> {
  const apiHost = url.hostname.includes(".eu.") ? "api.eu.lever.co" : "api.lever.co";
  const [job, page] = await Promise.all([
    fetchJson<LeverJob>(`https://${apiHost}/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(id)}?mode=json`),
    safeFetch(url.toString()).catch(() => null),
  ]);
  if (!job?.text) return null;
  // Lever page titles read "Company Name - Job Title".
  const pageTitle = page ? titleTag(page.text) : undefined;
  const companyName = pageTitle?.endsWith(` - ${job.text}`) ? pageTitle.slice(0, -job.text.length - 3) : undefined;
  const lists = (job.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n\n");
  return {
    source: "lever",
    title: job.text,
    company: companyName || titleCase(company),
    location: job.categories?.location,
    department: job.categories?.team ?? job.categories?.department,
    description: [job.descriptionPlain, lists, job.additionalPlain].filter(Boolean).join("\n\n"),
  };
}

// Workday -------------------------------------------------------------------

interface WorkdayJob {
  jobPostingInfo?: { title: string; jobDescription?: string; location?: string };
  hiringOrganization?: { name?: string };
}

/** Workday org names are legal entities like "2100 NVIDIA USA"; trim them to the brand. */
function cleanLegalName(name: string | undefined): string | undefined {
  const cleaned = name
    ?.replace(/^\d+\s+/, "")
    .replace(/\b(USA|US|Inc|LLC|Ltd|Corp|Corporation|Company|GmbH|PLC)\b\.?/gi, "")
    .replace(/[\s,]+$/, "")
    .trim();
  return cleaned || undefined;
}

async function fromWorkday(url: URL): Promise<ParsedJob | null> {
  const tenant = url.hostname.split(".")[0];
  const parts = url.pathname.split("/").filter(Boolean);
  if (/^[a-z]{2}-[A-Z]{2}$/.test(parts[0] ?? "")) parts.shift();
  const jobIndex = parts.findIndex((p) => p === "job" || p === "details");
  if (jobIndex < 1) return null;
  const site = parts[jobIndex - 1];
  const rest = parts.slice(jobIndex + 1).join("/");
  const data = await fetchJson<WorkdayJob>(`https://${url.hostname}/wday/cxs/${tenant}/${site}/job/${rest}`);
  const info = data?.jobPostingInfo;
  if (!info?.title) return null;
  return {
    source: "workday",
    title: info.title,
    company: cleanLegalName(data?.hiringOrganization?.name) ?? titleCase(tenant),
    location: info.location,
    description: htmlToText(info.jobDescription ?? ""),
  };
}

// SmartRecruiters -----------------------------------------------------------

interface SmartRecruitersJob {
  name: string;
  company?: { name?: string };
  location?: { city?: string; country?: string };
  department?: { label?: string };
  jobAd?: { sections?: Record<string, { text?: string }> };
}

async function fromSmartRecruiters(company: string, id: string): Promise<ParsedJob | null> {
  const job = await fetchJson<SmartRecruitersJob>(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(id)}`,
  );
  if (!job?.name) return null;
  const sections = Object.values(job.jobAd?.sections ?? {})
    .map((s) => htmlToText(s.text ?? ""))
    .filter(Boolean);
  return {
    source: "smartrecruiters",
    title: job.name,
    company: job.company?.name ?? titleCase(company),
    location: [job.location?.city, job.location?.country?.toUpperCase()].filter(Boolean).join(", ") || undefined,
    department: job.department?.label,
    description: sections.join("\n\n"),
  };
}

// Any other page: JSON-LD JobPosting first, then meta tags -------------------

function jobPostingNode(html: string): LdNode | undefined {
  return jsonLdNodes(html).find((n) => {
    const type = n["@type"];
    return type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
  });
}

function ldLocation(value: unknown): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const address = (first as LdNode | undefined)?.address as LdNode | undefined;
  if (!address) return undefined;
  const parts = [address.addressLocality, address.addressRegion, address.addressCountry]
    .map((p) => (typeof p === "string" ? p : (p as LdNode | undefined)?.name))
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  return parts.join(", ") || undefined;
}

async function fromPage(url: URL): Promise<ParsedJob | null> {
  const page = await safeFetch(url.toString());
  if (page.status !== 200) {
    if (isJobBoardHost(url.hostname)) {
      throw new FetchError(
        `${registrableDomain(url.hostname)} didn't let us read that page (status ${page.status}). Enter the company and title manually below.`,
        422,
      );
    }
    return null;
  }
  const html = page.text;
  const finalHost = new URL(page.url).hostname;
  const posting = jobPostingNode(html);

  if (posting && typeof posting.title === "string") {
    const org = posting.hiringOrganization as LdNode | undefined;
    return {
      source: "jsonld",
      title: htmlToText(posting.title),
      company: typeof org?.name === "string" ? org.name : titleCase(registrableDomain(finalHost).split(".")[0]),
      location: ldLocation(posting.jobLocation),
      department: typeof posting.occupationalCategory === "string" ? posting.occupationalCategory : undefined,
      description: htmlToText(typeof posting.description === "string" ? posting.description : ""),
      domainHint: domainFromUrl(org?.sameAs) ?? domainFromUrl(org?.url) ?? domainFromUrl(page.url),
    };
  }

  const ogTitle = metaContent(html, "og:title") ?? titleTag(html);
  if (!ogTitle) return null;
  const description = metaContent(html, "og:description") ?? htmlToText(html).slice(0, 6000);

  // LinkedIn: "Acme hiring Senior Engineer in Austin, TX | LinkedIn"
  const linkedIn = ogTitle.match(/^(.+?) hiring (.+?)(?: in (.+?))? \| LinkedIn$/);
  if (linkedIn) {
    return { source: "meta", company: linkedIn[1], title: linkedIn[2], location: linkedIn[3], description };
  }
  // Indeed: "Senior Engineer - Acme - Austin, TX | Indeed.com"
  const indeed = ogTitle.match(/^(.+?) - (.+?) - (.+?) \| Indeed/);
  if (indeed) {
    return { source: "meta", title: indeed[1], company: indeed[2], location: indeed[3], description };
  }
  if (isJobBoardHost(finalHost)) return null;

  const siteName = metaContent(html, "og:site_name");
  const title = ogTitle.split(/\s[|\-@]\s/)[0].trim();
  return {
    source: "meta",
    title,
    company: siteName ?? titleCase(registrableDomain(finalHost).split(".")[0]),
    description,
    domainHint: registrableDomain(finalHost),
  };
}

// Entry points --------------------------------------------------------------

async function fromKnownAts(url: URL): Promise<ParsedJob | null> {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host.endsWith("greenhouse.io")) {
    const forParam = url.searchParams.get("for");
    const token = url.searchParams.get("token") ?? url.searchParams.get("gh_jid");
    if (forParam && token) return fromGreenhouse(forParam, token);
    const jobsAt = parts.indexOf("jobs");
    if (jobsAt >= 1 && parts[jobsAt + 1]) return fromGreenhouse(parts[jobsAt - 1], parts[jobsAt + 1]);
  }
  if (url.searchParams.get("gh_jid")) {
    // Company career sites embed Greenhouse with ?gh_jid=; the board is usually the brand name.
    const guess = await fromGreenhouse(registrableDomain(host).split(".")[0], url.searchParams.get("gh_jid")!);
    if (guess) return guess;
  }
  if (host.endsWith("lever.co") && parts.length >= 2) return fromLever(url, parts[0], parts[1]);
  if (host === "jobs.ashbyhq.com" && parts.length >= 2) {
    // Ashby's board API returns every posting at once (megabytes for big companies),
    // while each job page carries complete JobPosting JSON-LD.
    const job = await fromPage(url);
    return job ? { ...job, source: "ashby" } : null;
  }
  if (host.endsWith("myworkdayjobs.com") || host.endsWith("myworkdaysite.com")) return fromWorkday(url);
  if (host.endsWith("smartrecruiters.com") && parts.length >= 2) {
    const id = parts[1].match(/^\d+/)?.[0];
    if (id) return fromSmartRecruiters(parts[0], id);
  }
  return null;
}

function finalize(url: string, job: ParsedJob): JobInfo {
  const description = job.description.slice(0, 20_000);
  return {
    ...job,
    url,
    title: job.title.replace(/\s+/g, " ").trim(),
    company: job.company.replace(/\s+/g, " ").trim(),
    description,
    reportsTo: findReportsTo(description),
  };
}

export async function parseJobUrl(raw: string): Promise<JobInfo> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FetchError("That doesn't look like a valid link.");
  }
  // LinkedIn "collections" and search URLs carry the real posting id in a query param.
  const linkedInId = url.hostname.endsWith("linkedin.com") ? url.searchParams.get("currentJobId") : null;
  if (linkedInId) url = new URL(`https://www.linkedin.com/jobs/view/${linkedInId}/`);

  const job = (await fromKnownAts(url)) ?? (await fromPage(url));
  if (!job) {
    throw new FetchError("We couldn't read a job posting from that page. Enter the company and title manually below.", 422);
  }
  return finalize(url.toString(), job);
}

export function manualJob(input: { title: string; company: string; description?: string; url?: string }): JobInfo {
  return finalize(input.url ?? "", {
    source: "manual",
    title: input.title,
    company: input.company,
    description: input.description ?? "",
  });
}
