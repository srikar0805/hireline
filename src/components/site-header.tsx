import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="focus-ring group flex items-center gap-2 rounded-md">
      <span className="grid size-7 place-items-center rounded-lg bg-ink text-paper">
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden>
          <path d="M3 10h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M10 5l5 5-5 5" stroke="var(--color-sun)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">HireLine</span>
    </Link>
  );
}

const NAV = [
  { href: "/find", label: "Find contacts" },
  { href: "/tracker", label: "Tracker" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm text-muted md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="focus-ring rounded-md px-3 py-2 hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/tracker" className="focus-ring rounded-md px-3 py-2 text-sm text-muted hover:text-ink md:hidden">
            Tracker
          </Link>
          <Link
            href="/find"
            className="focus-ring rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-accent-strong"
          >
            Paste a job link
          </Link>
        </div>
      </div>
    </header>
  );
}
