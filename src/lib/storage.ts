import { EMPTY_PROFILE, type SenderProfile } from "./draft";

export type LeadStatus = "saved" | "emailed" | "followed-up" | "replied" | "interviewing" | "closed";

export const LEAD_STATUSES: { id: LeadStatus; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "emailed", label: "Emailed" },
  { id: "followed-up", label: "Followed up" },
  { id: "replied", label: "Replied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "closed", label: "Closed" },
];

export interface LeadContact {
  name: string;
  role: string;
  kind: "manager" | "recruiter";
  email?: string;
  profileUrl?: string;
}

export interface Lead {
  id: string;
  savedAt: string;
  jobUrl: string;
  title: string;
  company: string;
  domain: string | null;
  contacts: LeadContact[];
  status: LeadStatus;
  notes: string;
  emailedAt?: string;
}

const LEADS_KEY = "hireline.leads.v1";
const PROFILE_KEY = "hireline.profile.v1";

// Everything stays in this browser: no accounts, no server-side storage.
function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the app still works without it.
  }
}

// A tiny external store so the tracker can use useSyncExternalStore and stay in
// sync across tabs without a hydration mismatch.
const listeners = new Set<() => void>();
const NO_LEADS: Lead[] = [];
let snapshot: { raw: string | null; leads: Lead[] } | null = null;

export function getLeadsSnapshot(): Lead[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LEADS_KEY);
  } catch {
    return NO_LEADS;
  }
  if (!snapshot || snapshot.raw !== raw) {
    let leads = NO_LEADS;
    try {
      leads = raw ? (JSON.parse(raw) as Lead[]) : NO_LEADS;
    } catch {
      // Corrupt storage; treat it as empty.
    }
    snapshot = { raw, leads };
  }
  return snapshot.leads;
}

export const getServerLeadsSnapshot = () => NO_LEADS;

export function subscribeLeads(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LEADS_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export const loadLeads = (): Lead[] => [...getLeadsSnapshot()];

export function saveLeads(leads: Lead[]) {
  write(LEADS_KEY, leads);
  listeners.forEach((l) => l());
}

export function upsertLead(lead: Lead) {
  const leads = loadLeads();
  const index = leads.findIndex((l) => l.id === lead.id);
  if (index >= 0) leads[index] = lead;
  else leads.unshift(lead);
  saveLeads(leads);
}

export function updateLead(id: string, patch: Partial<Lead>) {
  saveLeads(loadLeads().map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

export function removeLead(id: string) {
  saveLeads(loadLeads().filter((l) => l.id !== id));
}

export const loadProfile = () => ({ ...EMPTY_PROFILE, ...read<Partial<SenderProfile>>(PROFILE_KEY, {}) });
export const saveProfile = (profile: SenderProfile) => write(PROFILE_KEY, profile);

/** Stable id so looking up the same posting twice updates one tracker row. */
export function leadId(jobUrl: string, company: string, title: string): string {
  const key = (jobUrl || `${company}|${title}`).toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (Math.imul(31, hash) + key.charCodeAt(i)) | 0;
  return `lead_${(hash >>> 0).toString(36)}`;
}
