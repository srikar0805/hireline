const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "com.au",
  "net.au",
  "co.in",
  "co.jp",
  "com.br",
  "co.nz",
  "com.sg",
  "com.mx",
  "co.za",
]);

/** Hosts that belong to job boards or applicant tracking systems, never to the employer. */
const JOB_BOARD_DOMAINS = new Set([
  "adp.com",
  "applytojob.com",
  "ashbyhq.com",
  "bamboohr.com",
  "breezy.hr",
  "builtin.com",
  "dice.com",
  "glassdoor.com",
  "google.com",
  "greenhouse.io",
  "icims.com",
  "indeed.com",
  "jazzhr.com",
  "jobvite.com",
  "joinhandshake.com",
  "lever.co",
  "linkedin.com",
  "monster.com",
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "oraclecloud.com",
  "paylocity.com",
  "personio.com",
  "personio.de",
  "pinpointhq.com",
  "recruitee.com",
  "rippling.com",
  "simplyhired.com",
  "smartrecruiters.com",
  "successfactors.com",
  "taleo.net",
  "teamtailor.com",
  "ultipro.com",
  "wellfound.com",
  "workable.com",
  "ycombinator.com",
  "ziprecruiter.com",
]);

export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  const lastTwo = parts.slice(-2).join(".");
  return MULTI_PART_TLDS.has(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
}

export function isJobBoardHost(host: string): boolean {
  return JOB_BOARD_DOMAINS.has(registrableDomain(host));
}

/** Accepts "stripe.com", "https://www.stripe.com/jobs" or "jane@stripe.com"; returns "stripe.com" or null. */
export function normalizeDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("@")) s = s.split("@").pop() ?? "";
  s = s.replace(/^[a-z]+:\/\//, "").split(/[/?#:]/)[0];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) || !/\.[a-z]{2,}$/.test(s)) return null;
  return registrableDomain(s);
}
