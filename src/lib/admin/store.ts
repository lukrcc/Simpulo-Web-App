"use client";

// The admin collections in the browser: the waitlist, the host applications and the admin log. They start from the data adapter
// (getAdminData – the mock now, Firestore later) and this browser keeps its changes (localStorage, try/catch; "Reset mock data" clears it).
// The waitlist and the host application write here (addWaitlistEntry, addHostApplication); admin actions only through lib/admin/actions.ts,
// which also writes the log.
import { useSyncExternalStore } from "react";
import { getAdminData, type AdminData, type TaxQuestion } from "@/lib/data";
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
          applications: (saved.applications ?? seed.applications).map((a) => ({ ...a, audienceSize: a.audienceSize ?? seed.applications.find((s) => s.id === a.id)?.audienceSize ?? 0 })), log: saved.log ?? seed.log, tickets: saved.tickets ?? seed.tickets, withdrawals: saved.withdrawals ?? seed.withdrawals, taskStates: saved.taskStates ?? seed.taskStates, receipts: saved.receipts ?? seed.receipts, taxQuestions: saved.taxQuestions ?? seed.taxQuestions, fundingMoved: saved.fundingMoved ?? seed.fundingMoved, fundingDocs: saved.fundingDocs ?? seed.fundingDocs, location: saved.location ?? seed.location }
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

/** "Join the waitlist" (its own prompt) – the one way in. */
export function addWaitlistEntry(entry: Omit<WaitlistEntry, "id" | "createdAt">): WaitlistEntry {
  const added: WaitlistEntry = { ...entry, id: newId("wl"), createdAt: new Date().toISOString() };
  write({ ...read(), waitlist: [...read().waitlist, added] });
  return added;
}

/** "Apply as a host" (its own prompt) – the one way in; it starts as "new". */
export function addHostApplication(application: Omit<HostApplication, "id" | "createdAt" | "status">): HostApplication {
  const added: HostApplication = { ...application, id: newId("app"), status: "new", createdAt: new Date().toISOString() };
  write({ ...read(), applications: [...read().applications, added] });
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

/** Internal – lib/admin/actions.ts saves the location decision (Vision › Standort) and logs it. */
export function setLocation(location: AdminData["location"]) {
  write({ ...read(), location });
}

/** Internal – lib/admin/actions.ts decides and logs together. */
export function setApplicationStatus(id: string, status: ApplicationStatus) {
  write({ ...read(), applications: read().applications.map((a) => (a.id === id ? { ...a, status } : a)) });
}

/** Internal – every admin action goes through lib/admin/actions.ts, which writes here. */
export function appendAdminLog(action: AdminAction, target: string, by: string) {
  const entry: AdminLogEntry = { id: newId("log"), action, target, by, createdAt: new Date().toISOString() };
  write({ ...read(), log: [entry, ...read().log] });
}
