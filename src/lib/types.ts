export type JobSource =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "smartrecruiters"
  | "jsonld"
  | "meta"
  | "manual";

export interface JobInfo {
  url: string;
  source: JobSource;
  title: string;
  company: string;
  location?: string;
  department?: string;
  /** Plain-text job description. */
  description: string;
  /** "Reports to ..." line pulled from the description, when present. */
  reportsTo?: string;
  /** Company website domain when the posting itself exposes it. */
  domainHint?: string;
}

export type PatternId =
  | "first.last"
  | "first"
  | "flast"
  | "firstlast"
  | "firstl"
  | "f.last"
  | "first_last"
  | "last"
  | "last.first"
  | "first-last";

export interface EmailEvidence {
  /** Pattern inferred from real addresses found on the company's public site. */
  pattern: PatternId | null;
  /** Personal-looking addresses found (role inboxes like jobs@ are excluded). */
  samples: string[];
  pagesScanned: number;
}

export type DomainSource = "posting" | "guess" | "user";

export interface CompanyInfo {
  domain: string | null;
  domainSource: DomainSource | null;
  hasMx: boolean;
  mailProvider: string | null;
  evidence: EmailEvidence;
}

export interface RoleTarget {
  /** Short label, e.g. "Engineering Manager". */
  label: string;
  /** Titles to search for, most likely first. */
  titles: string[];
  /** Team or product keyword pulled from the job title, if any. */
  team?: string;
  why: string;
}

export interface HiringTeam {
  hiringManagers: RoleTarget[];
  recruiters: RoleTarget[];
}

export interface LookupResult {
  job: JobInfo;
  company: CompanyInfo;
  team: HiringTeam;
}
