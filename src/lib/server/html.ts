import "server-only";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "-",
  mdash: "-",
  hellip: "...",
  bull: "*",
  middot: "*",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function htmlToText(html: string): string {
  let s = html;
  // Greenhouse returns entity-encoded HTML; decode once so the tags can be stripped.
  if (/&lt;\w/.test(s) && !/<\w/.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(s)
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function metaContent(html: string, key: string): string | undefined {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"))?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() : undefined;
}

export function titleTag(html: string): string | undefined {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return t ? decodeEntities(t).trim() : undefined;
}

export type LdNode = Record<string, unknown>;

function flattenLd(value: unknown): LdNode[] {
  if (Array.isArray(value)) return value.flatMap(flattenLd);
  if (value && typeof value === "object") {
    const node = value as LdNode;
    return "@graph" in node ? flattenLd(node["@graph"]) : [node];
  }
  return [];
}

export function jsonLdNodes(html: string): LdNode[] {
  const nodes: LdNode[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      nodes.push(...flattenLd(JSON.parse(m[1].trim())));
    } catch {
      // Malformed JSON-LD is common; skip it.
    }
  }
  return nodes;
}
