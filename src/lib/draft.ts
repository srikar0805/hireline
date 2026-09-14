import type { JobInfo } from "./types";

export interface SenderProfile {
  name: string;
  /** One sentence on who you are. */
  pitch: string;
  /** One concrete result you are proud of. */
  proof: string;
  /** LinkedIn, portfolio or GitHub, one per line. */
  links: string;
  /** Pasted resume text, used only for skill matching in the browser. */
  resume: string;
}

export const EMPTY_PROFILE: SenderProfile = { name: "", pitch: "", proof: "", links: "", resume: "" };

export type RecipientKind = "manager" | "recruiter";

interface Skill {
  name: string;
  pattern?: string;
}

const SKILLS: Skill[] = [
  { name: "Python" }, { name: "Java" }, { name: "JavaScript" }, { name: "TypeScript" },
  { name: "Go", pattern: "golang" }, { name: "Rust" }, { name: "C++", pattern: "c\\+\\+" },
  { name: "C#", pattern: "c#" }, { name: "Ruby" }, { name: "PHP" }, { name: "Kotlin" }, { name: "Swift" },
  { name: "Scala" }, { name: "SQL" }, { name: "React" }, { name: "Next.js", pattern: "next\\.?js" },
  { name: "Vue" }, { name: "Angular" }, { name: "Node.js", pattern: "node\\.?js" }, { name: "Django" },
  { name: "Flask" }, { name: "FastAPI" }, { name: "Spring" }, { name: "Rails" }, { name: ".NET", pattern: "\\.net" },
  { name: "GraphQL" }, { name: "REST APIs", pattern: "rest(ful)? apis?" }, { name: "gRPC" }, { name: "AWS" },
  { name: "GCP", pattern: "gcp|google cloud" }, { name: "Azure" }, { name: "Kubernetes" }, { name: "Docker" },
  { name: "Terraform" }, { name: "CI/CD", pattern: "ci/cd|continuous integration" }, { name: "Linux" },
  { name: "Kafka" }, { name: "Spark" }, { name: "Airflow" }, { name: "dbt" }, { name: "Snowflake" },
  { name: "BigQuery" }, { name: "Databricks" }, { name: "PostgreSQL", pattern: "postgres(ql)?" },
  { name: "MySQL" }, { name: "MongoDB" }, { name: "Redis" }, { name: "Elasticsearch" }, { name: "DynamoDB" },
  { name: "microservices" }, { name: "distributed systems" }, { name: "system design" },
  { name: "machine learning" }, { name: "deep learning" }, { name: "NLP", pattern: "nlp|natural language processing" },
  { name: "computer vision" }, { name: "LLMs", pattern: "llms?|large language models?" },
  { name: "RAG", pattern: "rag|retrieval[- ]augmented" }, { name: "PyTorch" }, { name: "TensorFlow" },
  { name: "scikit-learn" }, { name: "pandas" }, { name: "NumPy" }, { name: "data pipelines", pattern: "data pipelines?" },
  { name: "ETL" }, { name: "A/B testing", pattern: "a/b test(ing|s)?" }, { name: "experimentation" },
  { name: "statistics", pattern: "statistics|statistical" }, { name: "Tableau" }, { name: "Power BI" },
  { name: "Looker" }, { name: "Excel" }, { name: "Figma" }, { name: "user research" }, { name: "prototyping" },
  { name: "design systems", pattern: "design systems?" }, { name: "accessibility" }, { name: "product strategy" },
  { name: "roadmapping", pattern: "roadmap(ping|s)?" }, { name: "stakeholder management", pattern: "stakeholders?" },
  { name: "Agile" }, { name: "Scrum" }, { name: "SaaS" }, { name: "B2B" }, { name: "Salesforce" },
  { name: "HubSpot" }, { name: "SEO" }, { name: "content marketing" }, { name: "lead generation" },
  { name: "forecasting" }, { name: "negotiation" }, { name: "financial modeling" }, { name: "FP&A", pattern: "fp&a" },
  { name: "GAAP" }, { name: "budgeting" }, { name: "security", pattern: "security|infosec" },
  { name: "observability" }, { name: "iOS" }, { name: "Android" }, { name: "React Native" }, { name: "Flutter" },
  { name: "embedded systems", pattern: "embedded" }, { name: "CUDA" }, { name: "evaluation", pattern: "evals?|evaluation" },
];

const skillRegex = (s: Skill) =>
  new RegExp(`(?<![a-z0-9])(${s.pattern ?? s.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![a-z0-9])`, "i");

export interface SkillMatch {
  /** Skills in both the posting and your resume, in the order the posting mentions them. */
  matched: string[];
  /** Skills the posting mentions that your resume doesn't. */
  missing: string[];
}

export function matchSkills(jobText: string, resumeText: string): SkillMatch {
  const inJob = SKILLS.map((s) => ({ s, at: jobText.search(skillRegex(s)) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const { s } of inJob) (skillRegex(s).test(resumeText) ? matched : missing).push(s.name);
  return { matched, missing };
}

const joinList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export interface Draft {
  subject: string;
  body: string;
}

export function buildDraft(
  job: Pick<JobInfo, "title" | "company">,
  recipientName: string,
  kind: RecipientKind,
  profile: SenderProfile,
  skills: SkillMatch,
  team?: string,
): Draft {
  const firstName = recipientName.trim().split(/\s+/)[0] || "there";
  const top = skills.matched.slice(0, 3);
  const pitch = profile.pitch.trim() || "[One sentence on who you are, e.g. I'm a backend engineer with 3 years building payment systems.]";
  const fitLine = top.length
    ? `My experience with ${joinList(top)} lines up closely with what the role calls for.`
    : "My experience lines up closely with what the role calls for.";
  const proof = profile.proof.trim() ? `\nOne recent example: ${profile.proof.trim().replace(/\.?$/, ".")}` : "";
  const signature = [profile.name.trim() || "[Your name]", profile.links.trim()].filter(Boolean).join("\n");
  const teamPart = team ? ` on the ${team} team` : "";

  const subject = `${job.title} at ${job.company}${profile.name.trim() ? `: ${profile.name.trim()}` : ""}`;

  const body =
    kind === "manager"
      ? `Hi ${firstName},

I just applied for the ${job.title} role${teamPart} at ${job.company}, and I wanted to reach out directly since it looks like the position may sit on your team.

${pitch} ${fitLine}${proof}

Would you be open to a quick 15 minute call in the next couple of weeks? If you're not the right person, I'd really appreciate a pointer to whoever is.

Thanks for your time,
${signature}`
      : `Hi ${firstName},

I applied for the ${job.title} role${teamPart} at ${job.company} and wanted to introduce myself, since it looks like you may be supporting this search.

${pitch} ${fitLine}${proof}

If my background looks like a fit, I'd love to be considered for a first conversation. I'm happy to send my resume or answer any questions.

Best,
${signature}`;

  return { subject, body };
}

const enc = encodeURIComponent;

export function composeLinks(to: string, draft: Draft) {
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(to)}&su=${enc(draft.subject)}&body=${enc(draft.body)}`,
    outlook: `https://outlook.office.com/mail/deeplink/compose?to=${enc(to)}&subject=${enc(draft.subject)}&body=${enc(draft.body)}`,
    mailto: `mailto:${to}?subject=${enc(draft.subject)}&body=${enc(draft.body)}`,
  };
}
