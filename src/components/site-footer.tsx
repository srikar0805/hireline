import Link from "next/link";
import { Logo } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            A free tool for job seekers. No accounts, no paywall, and your searches and notes stay in your own browser.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Product</p>
          <Link className="block text-muted hover:text-ink" href="/find">
            Find contacts
          </Link>
          <Link className="block text-muted hover:text-ink" href="/tracker">
            Outreach tracker
          </Link>
          <Link className="block text-muted hover:text-ink" href="/#how">
            How it works
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Using it well</p>
          <Link className="block text-muted hover:text-ink" href="/#faq">
            FAQ
          </Link>
          <Link className="block text-muted hover:text-ink" href="/#etiquette">
            Outreach etiquette
          </Link>
        </div>
      </div>
      <div className="border-t border-line/70">
        <p className="mx-auto w-full max-w-6xl px-5 py-5 text-xs text-faint sm:px-8">
          HireLine only uses public job postings, public company websites and DNS records. It does not scrape or sell
          personal data.
        </p>
      </div>
    </footer>
  );
}
