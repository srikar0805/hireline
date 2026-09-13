# HireLine

A free tool for job seekers. Paste a job link and HireLine will:

1. **Read the posting** through the job board's official public API (Greenhouse, Lever, Ashby, Workday, SmartRecruiters) or the page's structured `JobPosting` data.
2. **Name the hiring team**: the two manager titles and two recruiter titles most likely to own the role, based on function, seniority and team, with one-click LinkedIn, Google and Bing searches for public profiles.
3. **Work out the email format**: find the company's domain, confirm it receives mail (DNS MX lookup), and read public pages on that domain for real addresses that reveal the naming format.
4. **Draft the email**: a short note built from your one-line pitch, a result you're proud of, and skills matched between your resume and the posting. It opens in Gmail, Outlook or your mail app.
5. **Track outreach**: saved jobs, contacts, status, notes, follow-up reminders and CSV export, all in `localStorage`.

No accounts, no database, no paid APIs.

## How it compares to paid lookup tools

Paid tools buy contact databases and verify inboxes through data vendors. HireLine does neither, which is what keeps it free:

| | Paid tools | HireLine |
| --- | --- | --- |
| Who the contacts are | Picked from a purchased database | Role-specific titles plus guided searches; you pick the person |
| Email | Vendor-verified | Format detected from the company's own site, ranked guesses |
| Your data | Stored on their servers | Stays in your browser |

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project layout

```
src/
  app/
    page.tsx               landing page
    find/page.tsx          the lookup tool
    tracker/page.tsx       outreach tracker
    api/lookup/route.ts    job link -> job, company email info, hiring team
    api/company/route.ts   re-check a corrected company domain
  components/              UI (finder, contact cards, composer, tracker)
  lib/
    roles.ts               function / seniority / team -> likely titles
    email.ts               name parsing and email format guesses
    draft.ts               skill matching, email template, compose links
    search-links.ts        LinkedIn, Google and Bing people searches
    storage.ts             localStorage tracker and profile
    server/
      job-parser.ts        ATS APIs, JSON-LD and meta tag parsing
      company.ts           domain guessing, MX lookup, email format scan
      safe-fetch.ts        SSRF-safe fetch (blocks private IPs, caps size and redirects)
      rate-limit.ts        simple in-memory per-IP limiter
```

## Deploy for free

Any Node host works. On Vercel's free Hobby plan, import the repo and deploy with the defaults. The API routes need the Node.js runtime (they use `node:dns`), which is the default.

## Limitations

- Email addresses are **not verified**. Confirming a specific inbox needs paid data or SMTP probing, which is unreliable and frequently blocked.
- Some sites (parts of LinkedIn and Indeed, JavaScript-only career pages) block automated reading. Use manual entry for those.
- The rate limiter is in-memory, so it resets on restart and isn't shared across server instances.

## Data and privacy

HireLine only reads public job postings, public company web pages and DNS records. It doesn't scrape LinkedIn profiles, store lookups on a server, or collect personal data. Your profile, resume text and tracker never leave your browser.
