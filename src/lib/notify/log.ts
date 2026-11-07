"use client";

import { useSyncExternalStore } from "react";

/** What a channel did – the Dev menu's log shows it (newest first). Kept in memory for this tab only. */
export interface NotifyLogEntry {
  id: string;
  at: string;
  channel: "push" | "email" | "emailQueued" | "emailDigest" | "emailWeekly";
  userId: string;
  text: string;
}

const MAX = 50;
let entries: NotifyLogEntry[] = [];
const listeners = new Set<() => void>();
let seq = 0;

export function logDelivery(entry: Omit<NotifyLogEntry, "id" | "at">) {
  entries = [{ ...entry, id: `log-${++seq}`, at: new Date().toISOString() }, ...entries].slice(0, MAX);
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const EMPTY: NotifyLogEntry[] = [];

export function useNotifyLog(): NotifyLogEntry[] {
  return useSyncExternalStore(subscribe, () => entries, () => EMPTY);
}

/** A short line for the demo's toast ("📧 Email sent: …"), shown only for the person using the app. Registered by NotifyBridge. */
type Announce = (channel: "push" | "email", userId: string, text: string) => void;
let announce: Announce = () => {};
export function setAnnounce(fn: Announce) {
  announce = fn;
}
export function announceDelivery(channel: "push" | "email", userId: string, text: string) {
  announce(channel, userId, text);
}
