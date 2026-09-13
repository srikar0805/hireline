import { inferHiringTeam } from "@/lib/roles";
import { resolveCompany } from "@/lib/server/company";
import { manualJob, parseJobUrl } from "@/lib/server/job-parser";
import { isRateLimited } from "@/lib/server/rate-limit";
import { FetchError } from "@/lib/server/safe-fetch";
import type { LookupResult } from "@/lib/types";

export const maxDuration = 30;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return Response.json({ error: "Too many lookups in a short time. Try again in a few minutes." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const url = text(body.url, 2_000);
  const title = text(body.title, 200);
  const company = text(body.company, 120);

  try {
    const job =
      title && company
        ? manualJob({ title, company, description: text(body.description, 20_000), url })
        : url
          ? await parseJobUrl(url)
          : null;
    if (!job) {
      return Response.json({ error: "Paste a job link, or enter the company and job title." }, { status: 400 });
    }
    const result: LookupResult = {
      job,
      company: await resolveCompany(job, text(body.domain, 200) || null),
      team: inferHiringTeam(job),
    };
    return Response.json(result);
  } catch (err) {
    if (err instanceof FetchError) return Response.json({ error: err.message }, { status: err.status });
    console.error("lookup failed", err);
    return Response.json({ error: "Something went wrong reading that job. Try entering it manually." }, { status: 500 });
  }
}
