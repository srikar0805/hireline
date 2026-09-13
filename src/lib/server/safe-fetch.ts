import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 4;
const USER_AGENT = "Mozilla/5.0 (compatible; HireLine/1.0; job link preview)";

export class FetchError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

/**
 * The server fetches links that users paste, so refuse anything that points at
 * localhost, cloud metadata endpoints, or private networks.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError("That doesn't look like a valid link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FetchError("Only http and https links are supported.");
  }
  if (url.username || url.password || (url.port && url.port !== "80" && url.port !== "443")) {
    throw new FetchError("That link isn't allowed.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string }[];
  try {
    addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  } catch {
    throw new FetchError(`Couldn't find the site ${host}.`);
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new FetchError("That link isn't allowed.");
  }
  return url;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export interface SafeFetchOptions {
  method?: "GET" | "POST";
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
}

export interface SafeResponse {
  url: string;
  status: number;
  contentType: string;
  text: string;
}

export async function safeFetch(raw: string, opts: SafeFetchOptions = {}): Promise<SafeResponse> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        body: opts.body,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          ...opts.headers,
        },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      });
    } catch {
      throw new FetchError(`Couldn't reach ${url.hostname}. The site may be slow or blocking automated requests.`, 502);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    return {
      url: url.toString(),
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      text: await readCapped(res, opts.maxBytes ?? MAX_BYTES),
    };
  }
  throw new FetchError("That link redirects too many times.", 502);
}

/** Returns parsed JSON for a 200 response, or null for anything else. */
export async function fetchJson<T>(url: string, opts: SafeFetchOptions = {}): Promise<T | null> {
  const res = await safeFetch(url, {
    ...opts,
    headers: { Accept: "application/json", ...opts.headers },
  });
  if (res.status !== 200) return null;
  try {
    return JSON.parse(res.text) as T;
  } catch {
    return null;
  }
}
