import { normalizeDomain } from "@/lib/domain";
import { resolveCompany } from "@/lib/server/company";
import { isRateLimited } from "@/lib/server/rate-limit";

export const maxDuration = 20;

/** Re-checks mail servers and email format after the user corrects the company domain. */
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
  const domain = typeof body.domain === "string" ? normalizeDomain(body.domain) : null;
  if (!domain) return Response.json({ error: "Enter a domain like stripe.com." }, { status: 400 });
  const company = typeof body.company === "string" ? body.company.slice(0, 120) : "";
  return Response.json(await resolveCompany({ company }, domain));
}
