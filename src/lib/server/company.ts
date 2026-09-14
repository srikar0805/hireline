import "server-only";
import { resolveMx } from "node:dns/promises";
import { normalizeDomain } from "@/lib/domain";
import { PATTERNS } from "@/lib/email";
import type { CompanyInfo, DomainSource, EmailEvidence, JobInfo, PatternId } from "@/lib/types";
import { safeFetch } from "./safe-fetch";

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

const MAIL_PROVIDERS: [RegExp, string][] = [
  [/(google|googlemail)\.com$/, "Google Workspace"],
  [/(outlook\.com|office365|microsoft)/, "Microsoft 365"],
  [/(pphosted|ppe-hosted)\.com$/, "Proofpoint"],
  [/mimecast/, "Mimecast"],
  [/zoho/, "Zoho Mail"],
  [/barracuda/, "Barracuda"],
  [/iphmx\.com$/, "Cisco Secure Email"],
];

export async function mailServer(domain: string): Promise<{ hasMx: boolean; provider: string | null }> {
  const records = await withTimeout(resolveMx(domain), 4_000);
  if (!records?.length) return { hasMx: false, provider: null };
  const exchanges = [...records].sort((a, b) => a.priority - b.priority).map((r) => r.exchange.toLowerCase());
  for (const exchange of exchanges) {
    const hit = MAIL_PROVIDERS.find(([re]) => re.test(exchange));
    if (hit) return { hasMx: true, provider: hit[1] };
  }
  return { hasMx: true, provider: null };
}

// Whole-segment matches for short or name-like words ("brand" must not exclude "brandon").
const ROLE_WORDS = new Set(
  "info hello hi hey help sales press media pr news jobs apply team office general admin mail orders returns shop store login sms events design product social trust safety docs ops it hr people data api dev account accounts ap ar partner partners service services report reports verify brand ir dpo gdpr in out us uk eu global hq example you your user".split(
    " ",
  ),
);

// Documentation placeholders. Matched as whole addresses so real Janes and Johns still count.
const PLACEHOLDERS = /^(jane|john)[._-]?(doe|smith)$|^(first|firstname)[._-]?(last|lastname)$|^your[._-]?name$|^name$/;

// Prefix matches for words that don't start real names.
const ROLE_ROOTS =
  "notice complaint verification regulatory privacy security support career recruit talent billing invoice partnership investor accessib feedback compliance abuse legal marketing customer noreply no-reply donotreply unsubscri newsletter webmaster postmaster hostmaster employ payroll finance procure ethics disclosure bounty developer engineering sponsor affiliat community enquir inquir notif alert hiring contact opportunit licens copyright dmca".split(
    " ",
  );

export function isRoleInbox(local: string): boolean {
  if (local.includes("+") || /\d/.test(local) || PLACEHOLDERS.test(local)) return true;
  if (ROLE_WORDS.has(local)) return true;
  return local
    .split(/[._-]/)
    .some(
      (seg) =>
        ROLE_WORDS.has(seg) || ROLE_ROOTS.some((root) => seg.startsWith(root) || (seg.length >= 8 && seg.includes(root))),
    );
}

// Hyphen and underscore addresses are usually shared inboxes, so they need more evidence.
const PATTERN_WEIGHT: Partial<Record<PatternId, number>> = {
  "first.last": 1,
  "f.last": 1,
  first_last: 0.5,
  "first-last": 0.5,
};

const SCAN_PATHS = ["/", "/contact", "/contact-us", "/about", "/about-us", "/team", "/company", "/press", "/newsroom", "/legal", "/privacy"];

/** Only separator-based formats can be read from an address without knowing the person's name. */
export function classifyLocalPart(local: string): PatternId | null {
  if (/^[a-z]{2,}\.[a-z]{2,}$/.test(local)) return "first.last";
  if (/^[a-z]\.[a-z]{2,}$/.test(local)) return "f.last";
  if (/^[a-z]{2,}_[a-z]{2,}$/.test(local)) return "first_last";
  if (/^[a-z]{2,}-[a-z]{2,}$/.test(local)) return "first-last";
  return null;
}

export async function scanEmailPattern(domain: string): Promise<EmailEvidence> {
  const addressRe = new RegExp(`[a-z0-9._%+-]+@(?:[a-z0-9-]+\\.)*${domain.replace(/\./g, "\\.")}(?![a-z0-9-])`, "gi");
  const found = new Set<string>();
  let pagesScanned = 0;

  await Promise.all(
    SCAN_PATHS.map(async (path) => {
      const res = await safeFetch(`https://${domain}${path}`, { timeoutMs: 4_000, maxBytes: 1_000_000 }).catch(() => null);
      if (!res || res.status !== 200) return;
      pagesScanned++;
      const text = res.text.replace(/&#64;|&commat;|%40/gi, "@");
      for (const m of text.matchAll(addressRe)) found.add(m[0].toLowerCase());
    }),
  );

  const samples = [...found]
    .filter((email) => {
      const local = email.split("@")[0];
      return local.length <= 40 && !isRoleInbox(local);
    })
    .slice(0, 12);

  const scores = new Map<PatternId, number>();
  for (const email of samples) {
    const pattern = classifyLocalPart(email.split("@")[0]);
    if (pattern) scores.set(pattern, (scores.get(pattern) ?? 0) + (PATTERN_WEIGHT[pattern] ?? 0));
  }
  const rank = (id: PatternId) => PATTERNS.findIndex((p) => p.id === id);
  const pattern =
    [...scores.entries()].filter(([, score]) => score >= 1).sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0]))[0]?.[0] ??
    null;
  return { pattern, samples, pagesScanned };
}

const COMPANY_SUFFIXES =
  /\b(inc|llc|ltd|limited|corp|corporation|co|company|group|holdings|technologies|technology|plc|gmbh|the)\b\.?/gi;

/** Tries brand.com, brand.io, brand.ai and brand.co, and keeps the first one that receives mail. */
export async function guessDomain(company: string): Promise<string | null> {
  const slug = company
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(COMPANY_SUFFIXES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (slug.length < 2) return null;
  const candidates = ["com", "io", "ai", "co"].map((tld) => `${slug}.${tld}`);
  const checks = await Promise.all(candidates.map((d) => mailServer(d)));
  return candidates.find((_, i) => checks[i].hasMx) ?? null;
}

export async function resolveCompany(
  job: Pick<JobInfo, "company" | "domainHint">,
  userDomain?: string | null,
): Promise<CompanyInfo> {
  let domain: string | null = null;
  let domainSource: DomainSource | null = null;

  const fromUser = userDomain ? normalizeDomain(userDomain) : null;
  if (fromUser) {
    domain = fromUser;
    domainSource = "user";
  } else if (job.domainHint) {
    domain = job.domainHint;
    domainSource = "posting";
  } else {
    domain = await guessDomain(job.company);
    domainSource = domain ? "guess" : null;
  }

  if (!domain) {
    return {
      domain: null,
      domainSource: null,
      hasMx: false,
      mailProvider: null,
      evidence: { pattern: null, samples: [], pagesScanned: 0 },
    };
  }
  const [mx, evidence] = await Promise.all([mailServer(domain), scanEmailPattern(domain)]);
  return { domain, domainSource, hasMx: mx.hasMx, mailProvider: mx.provider, evidence };
}
