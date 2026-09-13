import type { HiringTeam, JobInfo, RoleTarget } from "./types";

interface JobFunction {
  id: string;
  noun: string;
  match: RegExp;
  managers: string[];
  leaders: string[];
  execs: string[];
  recruiters: string[];
}

// Order matters: the first match wins, so narrower functions come before broad ones.
const FUNCTIONS: JobFunction[] = [
  {
    id: "people",
    noun: "People",
    match: /\b(recruit\w*|talent|people ops|people partner|hr|human resources|hrbp)\b/i,
    managers: ["Talent Acquisition Manager", "People Operations Manager"],
    leaders: ["Director of Talent Acquisition", "Head of People"],
    execs: ["VP of People", "Chief People Officer"],
    recruiters: ["Talent Acquisition Partner", "Recruiter"],
  },
  {
    id: "legal",
    noun: "Legal",
    match: /\b(counsel|legal|paralegal|attorney|compliance|privacy)\b/i,
    managers: ["Senior Counsel", "Legal Manager"],
    leaders: ["Head of Legal", "Deputy General Counsel"],
    execs: ["General Counsel", "Chief Legal Officer"],
    recruiters: ["Recruiter", "Talent Acquisition Partner"],
  },
  {
    id: "finance",
    noun: "Finance",
    match: /\b(finance|financial|accountant|accounting|fp&a|controller|tax|treasury|payroll|audit)\b/i,
    managers: ["Finance Manager", "Accounting Manager"],
    leaders: ["Director of Finance", "Controller"],
    execs: ["VP of Finance", "CFO"],
    recruiters: ["Recruiter", "Talent Acquisition Partner"],
  },
  {
    id: "admin",
    noun: "Workplace",
    match: /\b(executive assistant|administrative|admin assistant|office manager|chief of staff|receptionist)\b/i,
    managers: ["Chief of Staff", "Office Manager"],
    leaders: ["Head of Workplace", "Director of Operations"],
    execs: ["COO", "CEO"],
    recruiters: ["Recruiter", "Talent Acquisition Partner"],
  },
  {
    id: "risk",
    noun: "Risk",
    match: /\b(fraud|risk|abuse|trust (and|&) safety|investigat\w*|anti-money laundering|aml)\b/i,
    managers: ["Risk Manager", "Trust and Safety Manager"],
    leaders: ["Head of Risk", "Director of Trust and Safety"],
    execs: ["VP of Risk", "Chief Risk Officer"],
    recruiters: ["Recruiter", "Talent Acquisition Partner"],
  },
  {
    id: "program",
    noun: "Program Management",
    match: /\b(technical program manager|program manager|tpm)\b/i,
    managers: ["Technical Program Management Lead", "Manager, Technical Program Management"],
    leaders: ["Director of Technical Program Management", "Head of Program Management"],
    execs: ["VP of Engineering", "COO"],
    recruiters: ["Technical Recruiter", "Recruiter"],
  },
  {
    id: "data",
    noun: "Data",
    match: /\b(data scien\w*|research scientist|applied scientist|analyst|analytics|business intelligence)\b/i,
    managers: ["Data Science Manager", "Analytics Manager"],
    leaders: ["Director of Data Science", "Head of Data"],
    execs: ["VP of Data", "Chief Data Officer"],
    recruiters: ["Technical Recruiter", "Technical Sourcer"],
  },
  {
    id: "sales",
    noun: "Sales",
    match:
      /\b(account executive|sales|business development|sdr|bdr|account manager|partnerships?|solutions engineer|solutions consultant)\b/i,
    managers: ["Sales Manager", "Regional Sales Director"],
    leaders: ["Head of Sales", "Director of Sales"],
    execs: ["VP of Sales", "Chief Revenue Officer"],
    recruiters: ["GTM Recruiter", "Sales Recruiter"],
  },
  {
    id: "product",
    noun: "Product",
    match: /\b(product manager|product owner|product lead)\b/i,
    managers: ["Group Product Manager", "Senior Product Manager"],
    leaders: ["Director of Product", "Head of Product"],
    execs: ["VP of Product", "Chief Product Officer"],
    recruiters: ["Technical Recruiter", "Recruiter"],
  },
  {
    id: "engineering",
    noun: "Engineering",
    match:
      /\b(engineer\w*|developer|software|sre|devops|infrastructure|backend|back-end|frontend|front-end|full[- ]?stack|mobile|ios|android|qa|firmware|embedded|machine learning|ml)\b/i,
    managers: ["Engineering Manager", "Software Engineering Manager"],
    leaders: ["Director of Engineering", "Head of Engineering"],
    execs: ["VP of Engineering", "CTO"],
    recruiters: ["Technical Recruiter", "Technical Sourcer"],
  },
  {
    id: "design",
    noun: "Design",
    match: /\b(designer|design|ux|ui|user research\w*)\b/i,
    managers: ["Design Manager", "Senior Design Manager"],
    leaders: ["Director of Design", "Head of Design"],
    execs: ["VP of Design", "Chief Design Officer"],
    recruiters: ["Design Recruiter", "Recruiter"],
  },
  {
    id: "marketing",
    noun: "Marketing",
    match: /\b(marketing|growth|brand|content|communications|seo|demand gen\w*|social media)\b/i,
    managers: ["Marketing Manager", "Senior Marketing Manager"],
    leaders: ["Director of Marketing", "Head of Marketing"],
    execs: ["VP of Marketing", "CMO"],
    recruiters: ["GTM Recruiter", "Recruiter"],
  },
  {
    id: "customer",
    noun: "Customer Success",
    match: /\b(customer success|customer support|support|implementation|onboarding|customer experience)\b/i,
    managers: ["Customer Success Lead", "Support Manager"],
    leaders: ["Director of Customer Success", "Head of Support"],
    execs: ["VP of Customer Success", "Chief Customer Officer"],
    recruiters: ["Recruiter", "Talent Acquisition Partner"],
  },
  {
    id: "operations",
    noun: "Operations",
    match: /\b(operations|supply chain|logistics|procurement|strategy|bizops|project manager)\b/i,
    managers: ["Operations Manager", "Senior Operations Manager"],
    leaders: ["Director of Operations", "Head of Operations"],
    execs: ["VP of Operations", "COO"],
    recruiters: ["Recruiter", "Talent Acquisition Partner"],
  },
];

type Seniority = "intern" | "entry" | "ic" | "senior" | "staff" | "manager" | "director" | "exec";

// "Manager" in these titles describes an individual contributor, not a people manager.
const IC_MANAGER_TITLES = /\b(product|program|project|account|customer success|community|marketing|partner) manager\b/i;

export function detectSeniority(title: string): Seniority {
  if (/\b(intern|internship|co-?op)\b/i.test(title)) return "intern";
  if (/\b(new grad\w*|graduate|entry[- ]level|junior|jr\.?|university|early career|apprentice)\b/i.test(title)) {
    return "entry";
  }
  if (/\b(chief|vp|vice president|svp|evp|head of)\b/i.test(title)) return "exec";
  if (/\bdirector\b/i.test(title)) return "director";
  if (/\bmanager\b/i.test(title) && !IC_MANAGER_TITLES.test(title)) return "manager";
  if (/\b(staff|principal|distinguished|architect)\b/i.test(title)) return "staff";
  if (/\b(senior|sr\.?|lead|ii|iii|iv)\b/i.test(title)) return "senior";
  return "ic";
}

export function detectFunction(job: Pick<JobInfo, "title" | "department">): JobFunction | null {
  return (
    FUNCTIONS.find((f) => f.match.test(job.title)) ??
    (job.department ? FUNCTIONS.find((f) => f.match.test(job.department!)) : undefined) ??
    null
  );
}

const SENIORITY_WORDS =
  /\b(senior|sr\.?|junior|jr\.?|staff|principal|lead|intern(ship)?|new grad|remote|hybrid|onsite|full[- ]time|part[- ]time|contract|i{1,3}|iv|\d{4})\b/gi;

/** Pulls a team keyword out of titles like "Software Engineer, Payments" or "Designer (Growth)". */
export function detectTeam(job: Pick<JobInfo, "title" | "department">, fn: JobFunction | null): string | undefined {
  // The last qualifier is usually the most specific: "Engineer, Storage Platform - DGX Cloud" gives "DGX Cloud".
  const segments = job.title.split(/,|\s[-–|/]\s|\(/);
  const qualifier = segments.length > 1 ? segments[segments.length - 1].replace(/\)\s*$/, "") : undefined;
  const candidates = [qualifier, job.department?.replace(/^\d+\s+/, "")];
  for (const raw of candidates) {
    const cleaned = raw?.replace(SENIORITY_WORDS, "").replace(/\s{2,}/g, " ").trim();
    if (!cleaned || cleaned.length < 2 || cleaned.length > 40) continue;
    if (fn && cleaned.toLowerCase() === fn.noun.toLowerCase()) continue;
    if (/^(us|usa|uk|emea|apac|[A-Z]{2})$/i.test(cleaned) || /\b(new york|san francisco|london|remote)\b/i.test(cleaned)) {
      continue;
    }
    return cleaned;
  }
  return undefined;
}

export function inferHiringTeam(job: Pick<JobInfo, "title" | "department">): HiringTeam {
  const fn = detectFunction(job);
  const level = detectSeniority(job.title);
  const team = detectTeam(job, fn);
  const noun = fn?.noun ?? job.department?.replace(/^\d+\s+/, "") ?? "the team";

  const managers = fn?.managers ?? [`${noun} Manager`, "Hiring Manager"];
  const leaders = fn?.leaders ?? [`Director of ${noun}`, `Head of ${noun}`];
  const execs = fn?.execs ?? [`VP of ${noun}`, "CEO"];
  const seniorLeader = ["manager", "director", "exec"].includes(level);

  const hiringManagers: RoleTarget[] = seniorLeader
    ? [
        {
          label: leaders[0],
          titles: level === "manager" ? leaders : execs,
          team,
          why: "Manager-level hires usually report to a director or department head.",
        },
        {
          label: execs[0],
          titles: [...execs, "Co-founder", "CEO"],
          team,
          why: "At smaller companies, leadership roles are often hired by a VP or a founder.",
        },
      ]
    : [
        {
          label: managers[0],
          titles: managers,
          team,
          why: `Roles at this level typically report directly to a ${managers[0].toLowerCase()}.`,
        },
        {
          label: leaders[0],
          titles: leaders,
          team,
          why: "The skip-level leader often approves the hire and forwards strong notes down.",
        },
      ];

  const recruiterPrimary =
    level === "intern" || level === "entry"
      ? ["University Recruiter", "Campus Recruiter", "Early Career Recruiter"]
      : level === "director" || level === "exec"
        ? ["Executive Recruiter", "Head of Talent Acquisition"]
        : (fn?.recruiters ?? ["Recruiter", "Talent Acquisition Partner"]);

  const recruiters: RoleTarget[] = [
    {
      label: recruiterPrimary[0],
      titles: recruiterPrimary,
      why:
        level === "intern" || level === "entry"
          ? "Early career roles are usually run by a dedicated university recruiting team."
          : `Most ${noun.toLowerCase()} openings are owned by a recruiter who specializes in that function.`,
    },
    {
      label: "Talent Acquisition Partner",
      titles: ["Talent Acquisition Partner", "Talent Acquisition", "Recruiting Lead", "Sourcer"],
      why: "Generalist recruiters and sourcers often screen applicants before the specialist does.",
    },
  ];

  return { hiringManagers, recruiters };
}
