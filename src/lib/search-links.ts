import type { RoleTarget } from "./types";

const quote = (s: string) => `"${s.replace(/"/g, "")}"`;

function xrayQuery(company: string, target: RoleTarget, withTeam: boolean): string {
  const titles = target.titles.slice(0, 4).map(quote).join(" OR ");
  const team = withTeam && target.team ? ` ${quote(target.team)}` : "";
  return `site:linkedin.com/in ${quote(company)} (${titles})${team}`;
}

export interface SearchLink {
  label: string;
  href: string;
}

/** Search links that surface public profiles, so nobody's data is scraped or stored. */
export function searchLinks(company: string, target: RoleTarget): SearchLink[] {
  const links: SearchLink[] = [];
  const keywords = [target.titles[0], company, target.team].filter(Boolean).join(" ");
  links.push({
    label: "LinkedIn",
    href: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`,
  });
  if (target.team) {
    links.push({
      label: `Google + "${target.team}"`,
      href: `https://www.google.com/search?q=${encodeURIComponent(xrayQuery(company, target, true))}`,
    });
  }
  links.push({
    label: "Google",
    href: `https://www.google.com/search?q=${encodeURIComponent(xrayQuery(company, target, false))}`,
  });
  links.push({
    label: "Bing",
    href: `https://www.bing.com/search?q=${encodeURIComponent(xrayQuery(company, target, false))}`,
  });
  return links;
}
