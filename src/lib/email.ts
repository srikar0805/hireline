import type { PatternId } from "./types";

interface Pattern {
  id: PatternId;
  build: (first: string, last: string) => string;
}

/** Ordered roughly by how common each format is across company inboxes. */
export const PATTERNS: Pattern[] = [
  { id: "first.last", build: (f, l) => `${f}.${l}` },
  { id: "first", build: (f) => f },
  { id: "flast", build: (f, l) => `${f[0]}${l}` },
  { id: "firstlast", build: (f, l) => `${f}${l}` },
  { id: "f.last", build: (f, l) => `${f[0]}.${l}` },
  { id: "firstl", build: (f, l) => `${f}${l[0]}` },
  { id: "first_last", build: (f, l) => `${f}_${l}` },
  { id: "last", build: (_f, l) => l },
  { id: "last.first", build: (f, l) => `${l}.${f}` },
  { id: "first-last", build: (f, l) => `${f}-${l}` },
];

export interface ParsedName {
  first: string;
  last: string;
  display: string;
}

const HONORIFICS = /^(dr|mr|mrs|ms|mx|prof)\.?$/i;

/** "Dr. José García-López, PhD (she/her)" becomes { first: "jose", last: "garcialopez" }. */
export function parseName(full: string): ParsedName | null {
  const display = full
    .replace(/\(.*?\)/g, " ")
    .split(/,|\s\|\s/)[0]
    .replace(/\s+/g, " ")
    .trim();
  const tokens = display
    .split(" ")
    .filter((t) => !HONORIFICS.test(t))
    .map((t) =>
      t
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z]/g, ""),
    )
    .filter(Boolean);
  if (tokens.length < 2) return null;
  return { first: tokens[0], last: tokens[tokens.length - 1], display };
}

export interface EmailGuess {
  email: string;
  pattern: PatternId;
  confidence: "best" | "common" | "possible";
}

export function emailGuesses(name: ParsedName, domain: string, knownPattern: PatternId | null): EmailGuess[] {
  const ordered = knownPattern
    ? [PATTERNS.find((p) => p.id === knownPattern)!, ...PATTERNS.filter((p) => p.id !== knownPattern)]
    : PATTERNS;
  const seen = new Set<string>();
  const guesses: EmailGuess[] = [];
  ordered.forEach((p, i) => {
    const email = `${p.build(name.first, name.last)}@${domain}`;
    if (seen.has(email)) return;
    seen.add(email);
    const confidence = knownPattern ? (i === 0 ? "best" : "possible") : i < 3 ? "common" : "possible";
    guesses.push({ email, pattern: p.id, confidence });
  });
  return guesses;
}

export function describePattern(id: PatternId): string {
  return PATTERNS.find((p) => p.id === id)!.build("jane", "doe");
}
