"use client";

// The admin collections in the browser: the waitlist, the host applications and the admin log. They start from the data adapter
// (getAdminData – the mock now, Firestore later) and this browser keeps its changes (localStorage, try/catch; "Reset mock data" clears it).
// The waitlist and the host application write here (addWaitlistEntry, addHostApplication); admin actions only through lib/admin/actions.ts,
// which also writes the log.
import { useSyncExternalStore } from "react";
import { getAdminData, type AdminData, type MarketingContact, type MarketingPartner, type TaxQuestion } from "@/lib/data";
import type { AdminAction, AdminLogEntry, ApplicationStatus, HostApplication, SupportTicket, WaitlistEntry, Withdrawal } from "@/lib/types";

/** Under the mock prefix, so "Reset mock data" (lib/store.tsx resetMockData) clears it too. */
const ADMIN_KEY = "simpulo:mock:admin:v1";

const seed: AdminData = getAdminData();
let current: AdminData | null = null;
const listeners = new Set<() => void>();

function read(): AdminData {
  if (current) return current;
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) ?? "null") as Partial<AdminData> | null;
    current = saved
      ? {
          waitlist: saved.waitlist ?? seed.waitlist,
          // Saved before followers were counted: they come from the seed.
          applications: (saved.applications ?? seed.applications).map((a) => ({ ...a, audienceSize: a.audienceSize ?? seed.applications.find((s) => s.id === a.id)?.audienceSize ?? 0 })), log: saved.log ?? seed.log, tickets: saved.tickets ?? seed.tickets, withdrawals: saved.withdrawals ?? seed.withdrawals, taskStates: saved.taskStates ?? seed.taskStates, receipts: saved.receipts ?? seed.receipts, taxQuestions: saved.taxQuestions ?? seed.taxQuestions, fundingMoved: saved.fundingMoved ?? seed.fundingMoved, fundingDocs: saved.fundingDocs ?? seed.fundingDocs, backlog: saved.backlog ?? seed.backlog, location: saved.location ?? seed.location, marketingContacts: saved.marketingContacts ?? seed.marketingContacts, marketingSteps: saved.marketingSteps ?? seed.marketingSteps, marketingClips: saved.marketingClips ?? seed.marketingClips, marketingPartners: saved.marketingPartners ?? seed.marketingPartners, houseDone: saved.houseDone ?? seed.houseDone, contentHouses: saved.contentHouses ?? seed.contentHouses, hostTax: saved.hostTax ?? seed.hostTax }
      : seed;
  } catch {
    current = seed;
  }
  return current;
}

function write(next: AdminData) {
  current = next;
  try {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(next));
  } catch {
    // not saved – it holds for this visit
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The admin collections; on the server and while hydrating the adapter's seed (never localStorage in the first render). */
export function useAdminData(): AdminData {
  return useSyncExternalStore(subscribe, read, () => seed);
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const sameEmail = (a?: string, b?: string) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

/**
 * "Join the waitlist" – the one way in. One entry per email: signing up again updates the wishes (and, if they had unsubscribed, starts the
 * double opt-in again). New entries wait for the confirmation click (confirmedAt null).
 */
export function addWaitlistEntry(entry: Omit<WaitlistEntry, "id" | "createdAt" | "confirmedAt" | "token">): WaitlistEntry {
  const data = read();
  const existing = data.waitlist.find((e) => sameEmail(e.email, entry.email));
  if (existing) {
    const again = Boolean(existing.unsubscribedAt);
    const next: WaitlistEntry = { ...existing, ...entry, interests: entry.interests.length ? entry.interests : existing.interests, where: entry.where ?? existing.where, when: entry.when ?? existing.when, token: existing.token ?? newId("wlt"), ...(again && { unsubscribedAt: undefined, confirmedAt: null }) };
    write({ ...data, waitlist: data.waitlist.map((e) => (e.id === existing.id ? next : e)) });
    return next;
  }
  const added: WaitlistEntry = { ...entry, id: newId("wl"), createdAt: new Date().toISOString(), confirmedAt: null, token: newId("wlt") };
  write({ ...data, waitlist: [...data.waitlist, added] });
  return added;
}

/** The confirmation link (double opt-in): the entry with this token is confirmed. Returns it (null: no such link). */
export function confirmWaitlist(token: string): WaitlistEntry | null {
  const data = read();
  const entry = data.waitlist.find((e) => e.token === token);
  if (!entry) return null;
  if (entry.confirmedAt || entry.unsubscribedAt) return entry;
  const next = { ...entry, confirmedAt: new Date().toISOString() };
  write({ ...data, waitlist: data.waitlist.map((e) => (e.id === entry.id ? next : e)) });
  return next;
}

/** The unsubscribe link (in every waitlist email): no more emails, not counted. Returns it (null: no such link). */
export function unsubscribeWaitlist(token: string): WaitlistEntry | null {
  const data = read();
  const entry = data.waitlist.find((e) => e.token === token);
  if (!entry) return null;
  if (entry.unsubscribedAt) return entry;
  const next = { ...entry, unsubscribedAt: new Date().toISOString() };
  write({ ...data, waitlist: data.waitlist.map((e) => (e.id === entry.id ? next : e)) });
  return next;
}

/** A waitlist entry by its link token (the confirm and unsubscribe pages). */
export function waitlistByToken(token: string): WaitlistEntry | null {
  return read().waitlist.find((e) => e.token === token) ?? null;
}

/**
 * "Become a host" – the one way in; it starts as "new". The Marketing › Kontakte entry with the same email is linked (contactId) – the
 * contact's detail shows the application, and the application the contact.
 */
export function addHostApplication(application: Omit<HostApplication, "id" | "createdAt" | "status">): HostApplication {
  const data = read();
  const contact = application.email ? data.marketingContacts.find((c) => sameEmail(c.email, application.email)) : undefined;
  const added: HostApplication = { ...application, ...(contact && { contactId: contact.id }), id: newId("app"), status: "new", createdAt: new Date().toISOString() };
  write({ ...data, applications: [...data.applications, added] });
  return added;
}

/** "Help & feedback" (and the House's "Something went wrong") – the one way in. Safety comes in with high priority. */
export function addSupportTicket(ticket: Omit<SupportTicket, "id" | "createdAt" | "status" | "priority" | "tags" | "votes" | "adminNotes" | "replies">): SupportTicket {
  const added: SupportTicket = {
    ...ticket,
    id: newId("t"),
    status: "new",
    priority: ticket.category === "safety" ? "high" : "normal",
    tags: [],
    votes: 1,
    adminNotes: "",
    replies: [],
    createdAt: new Date().toISOString(),
  };
  write({ ...read(), tickets: [added, ...read().tickets] });
  return added;
}

/**
 * The person's own follow-up in Messages › Simpulo Support: added to the ticket's replies (from "user"); an answered ticket is open again.
 * TODO(backend): server side, with the team told.
 */
export function addTicketFollowUp(ticketId: string, text: string) {
  const at = new Date().toISOString();
  write({
    ...read(),
    tickets: read().tickets.map((t) =>
      t.id === ticketId
        ? { ...t, replies: [...t.replies, { id: newId("r"), from: "user" as const, text, createdAt: at }], status: t.status === "answered" || t.status === "closed" ? "open" : t.status }
        : t,
    ),
  });
}

/**
 * The public ideas board (config/platform.ts ideasBoard, off): one vote per idea and browser – the ids voted for stay in this browser.
 * TODO(backend): one vote per account, server side.
 */
const VOTED_KEY = "simpulo:idea-votes";
export function votedIdeas(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(VOTED_KEY) ?? "[]") as unknown;
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
export function voteIdea(id: string) {
  const voted = votedIdeas();
  if (voted.includes(id)) return;
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...voted, id]));
  } catch {
    // not saved – the vote still counts for this visit
  }
  write({ ...read(), tickets: read().tickets.map((t) => (t.id === id ? { ...t, votes: t.votes + 1 } : t)) });
}

/** Internal – lib/admin/actions.ts changes a ticket and logs it. */
export function patchTicket(id: string, patch: (ticket: SupportTicket) => Partial<SupportTicket>) {
  write({ ...read(), tickets: read().tickets.map((t) => (t.id === id ? { ...t, ...patch(t) } : t)) });
}

/** Internal – lib/admin/actions.ts adds it and logs it. */
export function pushWithdrawal(withdrawal: Omit<Withdrawal, "id">): Withdrawal {
  const added: Withdrawal = { ...withdrawal, id: newId("wd") };
  write({ ...read(), withdrawals: [...read().withdrawals, added] });
  return added;
}

/** Internal – lib/admin/actions.ts changes an application (its tier) and logs it. */
export function patchApplication(id: string, patch: Partial<HostApplication>) {
  write({ ...read(), applications: read().applications.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
}

/** Internal – lib/admin/actions.ts marks a task (Admin › Heute) done or puts it off, and logs it. */
export function setTaskState(id: string, state: { done?: boolean; snoozedUntil?: string }) {
  write({ ...read(), taskStates: { ...read().taskStates, [id]: state } });
}

/** Internal – lib/admin/actions.ts attaches a receipt (Geld › Steuern; the mock keeps only the file name) and logs it. */
export function setReceipt(receiptNo: string, fileName: string) {
  write({ ...read(), receipts: { ...read().receipts, [receiptNo]: fileName } });
}

/** Internal – lib/admin/actions.ts changes a question for the tax advisor (status, note) and logs it. */
export function patchTaxQuestion(id: string, patch: Partial<TaxQuestion>) {
  write({ ...read(), taxQuestions: read().taxQuestions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
}

/** Internal – lib/admin/actions.ts sets "Umzug erledigt" (Finanzierung) and logs it. */
export function setFundingMoved(moved: boolean) {
  write({ ...read(), fundingMoved: moved });
}

/** Internal – lib/admin/actions.ts sets a data-room document's status (Finanzierung › Unterlagen) and logs it. */
export function setFundingDoc(key: string, status: AdminData["fundingDocs"][string]) {
  write({ ...read(), fundingDocs: { ...read().fundingDocs, [key]: status } });
}

/** Internal – lib/admin/actions.ts sets a backlog item's status (System › Backlog) and logs it. */
export function setBacklog(id: string, status: AdminData["backlog"][string]) {
  write({ ...read(), backlog: { ...read().backlog, [id]: status } });
}

/** Internal – lib/admin/actions.ts saves the location decision (Vision › Standort) and logs it. */
export function setLocation(location: AdminData["location"]) {
  write({ ...read(), location });
}

/** Internal – lib/admin/actions.ts decides and logs together. */
export function setApplicationStatus(id: string, status: ApplicationStatus) {
  write({ ...read(), applications: read().applications.map((a) => (a.id === id ? { ...a, status } : a)) });
}

/** Internal – every admin action goes through lib/admin/actions.ts, which writes here. */
export function appendAdminLog(action: AdminAction, target: string, by: string, ref?: string) {
  const entry: AdminLogEntry = { id: newId("log"), action, target, by, createdAt: new Date().toISOString(), ...(ref ? { ref } : {}) };
  write({ ...read(), log: [entry, ...read().log] });
}

// ─── Launch › Marketing (admin only; through lib/admin/actions.ts, which logs) ──────────────────────────────────────────────────────────

export function addMarketingContact(contact: Omit<MarketingContact, "id" | "createdAt">): MarketingContact {
  const added: MarketingContact = { ...contact, id: newId("mc"), createdAt: new Date().toISOString() };
  write({ ...read(), marketingContacts: [added, ...read().marketingContacts] });
  return added;
}

export function patchMarketingContact(id: string, patch: Partial<Omit<MarketingContact, "id" | "createdAt">>) {
  write({ ...read(), marketingContacts: read().marketingContacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}

/** Deleting is final (privacy): the contact is gone from the list; the log keeps only that a contact was deleted. */
export function deleteMarketingContact(id: string) {
  write({ ...read(), marketingContacts: read().marketingContacts.filter((c) => c.id !== id) });
}

export function setMarketingStep(id: string, done: boolean) {
  write({ ...read(), marketingSteps: { ...read().marketingSteps, [id]: done } });
}

/** Internal – Houses › "✓ Erledigt": the House leaves "Braucht Hilfe" until it comes back (needsHelp). */
/** A host's tax details (Settings › Payments & payouts) – stored for the admin only; the log says that they came, never what. */
export function submitHostTax(userId: string, data: { taxId: string; address: string }) {
  const at = new Date().toISOString();
  write({ ...read(), hostTax: { ...(read().hostTax ?? {}), [userId]: { taxId: data.taxId.trim().slice(0, 40), address: data.address.trim().slice(0, 300), at } } });
  appendAdminLog("host_tax_submitted", userId, userId);
}

export function setHouseDone(stayId: string, spotsFilled: number) {
  write({ ...read(), houseDone: { ...read().houseDone, [stayId]: { at: new Date().toISOString().slice(0, 10), spotsFilled } } });
}

/** Internal – Houses › "Für Content vormerken": the House lands in Marketing › Content (once). */
export function addContentHouse(stayId: string) {
  if (read().contentHouses.some((c) => c.stayId === stayId)) return;
  write({ ...read(), contentHouses: [{ stayId, at: new Date().toISOString().slice(0, 10) }, ...read().contentHouses] });
}

export function setMarketingClips(count: number) {
  write({ ...read(), marketingClips: Math.max(0, count) });
}

/**
 * A contact's demo link was opened (?ref=<contact id>, lib/store.tsx reads it on arrival): open or replied → "Demo gesehen", logged. Never
 * a step back (House opened, later stay). In the mock only in this browser; with Firestore a Cloud Function on the visit does it.
 */
export function markContactDemoSeen(id: string): MarketingContact | null {
  const contact = read().marketingContacts.find((c) => c.id === id);
  if (!contact || (contact.status !== "open" && contact.status !== "replied")) return null;
  patchMarketingContact(id, { status: "demo", demoSeenAt: new Date().toISOString() });
  appendAdminLog("marketing_demo_seen", contact.name, "system");
  return contact;
}

// ─── Launch › Marketing › Partner ─────────────────────────────────────────────────────────────────────────────────────────────────────

export function addMarketingPartner(partner: Omit<MarketingPartner, "id" | "refCode" | "createdAt">): MarketingPartner {
  const id = newId("mp");
  const added: MarketingPartner = { ...partner, id, refCode: id, createdAt: new Date().toISOString() };
  write({ ...read(), marketingPartners: [added, ...read().marketingPartners] });
  return added;
}

export function patchMarketingPartner(id: string, patch: Partial<Omit<MarketingPartner, "id" | "refCode" | "createdAt">>) {
  write({ ...read(), marketingPartners: read().marketingPartners.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
}

/** Deleting is final (privacy). */
export function deleteMarketingPartner(id: string) {
  write({ ...read(), marketingPartners: read().marketingPartners.filter((p) => p.id !== id) });
}
