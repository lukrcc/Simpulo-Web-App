"use client";

// The admin collections in the browser: the waitlist, the host applications and the admin log. They start from the data adapter
// (getAdminData – the mock now, Firestore later) and this browser keeps its changes (localStorage, try/catch; "Reset mock data" clears it).
// The waitlist and the host application write here (addWaitlistEntry, addHostApplication); admin actions only through lib/admin/actions.ts,
// which also writes the log.
import { useSyncExternalStore } from "react";
import { getAdminData, type AdminData } from "@/lib/data";
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
      ? { waitlist: saved.waitlist ?? seed.waitlist, applications: saved.applications ?? seed.applications, log: saved.log ?? seed.log, tickets: saved.tickets ?? seed.tickets, withdrawals: saved.withdrawals ?? seed.withdrawals }
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

/** Internal – lib/admin/actions.ts decides and logs together. */
export function setApplicationStatus(id: string, status: ApplicationStatus) {
  write({ ...read(), applications: read().applications.map((a) => (a.id === id ? { ...a, status } : a)) });
}

/** Internal – every admin action goes through lib/admin/actions.ts, which writes here. */
export function appendAdminLog(action: AdminAction, target: string, by: string) {
  const entry: AdminLogEntry = { id: newId("log"), action, target, by, createdAt: new Date().toISOString() };
  write({ ...read(), log: [entry, ...read().log] });
}
