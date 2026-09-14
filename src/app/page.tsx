import Link from "next/link";
import { LookupForm } from "@/components/lookup-form";

const STEPS = [
  {
    n: "01",
    title: "Paste the job link",
    body: "HireLine reads the posting straight from the job board's public API: title, team, location and the full description.",
  },
  {
    n: "02",
    title: "See who owns the role",
    body: "Based on the title, team and seniority, it names the two manager titles and two recruiter titles most likely to be hiring, with one-click searches for their public profiles.",
  },
  {
    n: "03",
    title: "Get the email and send",
    body: "It detects the company's email format from its own website, ranks the likely addresses, drafts a short note from your background, and opens it in Gmail or Outlook.",
  },
];

const COMPARISON = [
  ["Price", "$1.30 to $2 per lookup, on a subscription", "Free, unlimited within fair use"],
  ["Account", "Sign up, often with a card", "None. Open the page and go"],
  ["Choosing contacts", "Picked from a purchased contact database", "You pick, guided by role-specific searches"],
  ["Email addresses", "Verified by a paid data vendor", "Format read from the company's own site, ranked guesses"],
  ["Your data", "Stored on their servers", "Stays in your browser"],
];

const SOURCES = ["Greenhouse", "Lever", "Ashby", "Workday", "SmartRecruiters", "LinkedIn", "Company career pages"];

const FAQ = [
  {
    q: "Is it actually free?",
    a: "Yes. There is no paid tier. HireLine avoids paid contact databases entirely, so there is nothing to pass the cost on from. It runs on public job board APIs, public web pages and DNS lookups.",
  },
  {
    q: "How do you figure out someone's email?",
    a: "First we find the company's real domain and confirm it receives mail. Then we read public pages on that domain (contact, press, about, legal) for real addresses like jane.doe@company.com, which reveal the format the company uses. Once you add a name, we build that person's address in the detected format first and list the other common formats after it.",
  },
  {
    q: "Are the emails verified?",
    a: "No, and we say so plainly. Verifying that a specific inbox exists is what paid tools charge for. The format is usually right when we found real examples on the company's site. If we didn't, check the tips next to each guess before you send.",
  },
  {
    q: "Why don't you just show me the names?",
    a: "Showing names would mean scraping LinkedIn or buying personal data, and we don't do either. Instead we tell you exactly which titles to look for at that company and hand you the searches, so finding the right people takes about a minute.",
  },
  {
    q: "Which job sites work?",
    a: "Greenhouse, Lever, Ashby, Workday and SmartRecruiters links are read through their official public APIs. Most company career pages work through their structured job data. For sites that block automated reading, like some LinkedIn and Indeed pages, you can type the company and title in manually.",
  },
  {
    q: "Should I still apply through the website?",
    a: "Yes. Apply first, then email. Recruiters track candidates in their applicant system, and a note that says you already applied is much easier to act on.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-24">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              Free forever. No account. No credit card.
            </p>
            <h1 className="font-serif text-[44px] leading-[1.02] tracking-tight sm:text-6xl lg:text-[68px]">
              Skip the applicant pile.
              <br />
              <em className="text-accent">Email the people hiring.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Paste any job link. HireLine shows who most likely owns the role, works out the company&apos;s email
              format, and drafts a short note you send from your own inbox.
            </p>
            <div className="mt-9 max-w-xl">
              <LookupForm />
            </div>
            <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs text-faint">
              <span className="text-muted">Works with</span>
              {SOURCES.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-line bg-card">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <SectionHeading eyebrow="How it works" title="From job link to sent email in a few minutes" />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-card p-7">
                <p className="font-mono text-xs text-accent">{step.n}</p>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <SectionHeading eyebrow="Why free works" title="What paid lookup tools charge for, done in the open" />
        <div className="mt-10 overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs tracking-wide text-faint uppercase">
                <th className="px-5 py-4 font-medium" />
                <th className="px-5 py-4 font-medium">Typical paid tool</th>
                <th className="px-5 py-4 font-medium text-accent">HireLine</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([label, paid, free]) => (
                <tr key={label} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 font-medium">{label}</td>
                  <td className="px-5 py-4 text-muted">{paid}</td>
                  <td className="px-5 py-4">{free}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
          The honest tradeoff: HireLine can&apos;t promise an address is deliverable, because that check needs paid data.
          When it finds real addresses on the company&apos;s site, the format it suggests is usually right.
        </p>
      </section>

      <section id="etiquette" className="scroll-mt-20 mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 rounded-3xl bg-ink px-7 py-12 text-paper sm:px-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-sun uppercase">Outreach etiquette</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight">A short, specific note beats a long one.</h2>
            <p className="mt-4 leading-relaxed text-paper/70">
              People who hire get a lot of email. The notes that get replies are under 150 words, mention the exact
              role, and give one concrete reason you fit.
            </p>
          </div>
          <ul className="space-y-4 text-[15px] leading-relaxed text-paper/85">
            {[
              "Apply through the official posting first, then send your note.",
              "Email one manager and one recruiter, not the whole team.",
              "Lead with one result you're proud of, with a number if you have one.",
              "Follow up once after about 5 business days, then let it go.",
              "Never guess-send to every address format. Check first, then send one.",
            ].map((tip) => (
              <li key={tip} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sun" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 mx-auto w-full max-w-3xl px-5 pt-24 sm:px-8">
        <SectionHeading eyebrow="FAQ" title="Questions people ask" center />
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-left font-medium">
                {item.q}
                <span className="text-xl leading-none text-faint transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-14 text-center">
          <Link
            href="/find"
            className="focus-ring inline-flex rounded-full bg-accent px-6 py-3 font-medium text-white transition hover:bg-accent-strong"
          >
            Try it with a job link
          </Link>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, center = false }: { eyebrow: string; title: string; center?: boolean }) {
  return (
    <div className={center ? "text-center" : ""}>
      <p className="text-xs font-medium tracking-wide text-accent uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h2>
    </div>
  );
}

function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md select-none">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,var(--color-sun-soft),transparent_60%),radial-gradient(circle_at_80%_80%,var(--color-accent-soft),transparent_55%)]" />
      <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_24px_60px_-30px_rgba(21,23,28,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-faint">greenhouse.io</p>
            <p className="mt-1 font-semibold">Senior Software Engineer, Payments</p>
            <p className="text-sm text-muted">Acme Robotics · Austin, TX</p>
          </div>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Parsed</span>
        </div>
        <div className="mt-5 space-y-2.5">
          {[
            ["Hiring manager", "Engineering Manager, Payments"],
            ["Skip level", "Director of Engineering"],
            ["Recruiter", "Technical Recruiter"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm">
              <span className="text-muted">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-paper p-3.5">
          <p className="text-xs text-faint">Email format found on acmerobotics.com</p>
          <p className="mt-1 font-mono text-sm">
            <span className="text-accent">first.last</span>@acmerobotics.com
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-line p-3.5 text-sm leading-relaxed text-muted">
          <p className="text-ink">Hi Maya,</p>
          <p className="mt-1">
            I just applied for the Senior Software Engineer role on the Payments team and wanted to reach out
            directly...
          </p>
        </div>
      </div>
    </div>
  );
}
