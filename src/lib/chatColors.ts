"use client";

// A chat's colour, per chat and person (CLAUDE.md "Chat-Farben pro Chat"): Graphit (default) · Ocean · Sage · Sunset. It colours your own
// bubbles, the active send button and a faint glow (~3 %) in the chat's ground – never the others' bubbles, the unread dot or the bars.
// Kept in this browser for now (localStorage, try/catch), shaped for Firestore: one document per person and chat –
// TODO(firestore): users/{userId}/chatPrefs/{threadId} = { color, updatedAt }.
import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

export const CHAT_COLORS = ["graphite", "ocean", "sage", "sunset"] as const;
export type ChatColor = (typeof CHAT_COLORS)[number];
export const DEFAULT_CHAT_COLOR: ChatColor = "graphite";

/** The stored shape – the same fields the Firestore document will hold. */
export interface ChatColorPref {
  userId: string;
  threadId: string;
  color: ChatColor;
  updatedAt: string;
}

const KEY = "simpulo:chat-colors";
const listeners = new Set<() => void>();
let cache: Record<string, ChatColorPref> | null = null;
const keyOf = (userId: string, threadId: string) => `${userId}:${threadId}`;

function read(): Record<string, ChatColorPref> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, ChatColorPref>;
  } catch {
    cache = {};
  }
  return cache;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setChatColor(userId: string, threadId: string, color: ChatColor) {
  cache = { ...read(), [keyOf(userId, threadId)]: { userId, threadId, color, updatedAt: new Date().toISOString() } };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // not kept – still coloured for now
  }
  for (const listener of listeners) listener();
}

/** This person's colour for this chat – Graphit on the server and before hydration (Hydration rule). */
export function useChatColor(userId: string | null, threadId: string | null): [ChatColor, (color: ChatColor) => void] {
  const stored = useSyncExternalStore(subscribe, () => (userId && threadId ? (read()[keyOf(userId, threadId)]?.color ?? null) : null), () => null);
  const color = stored && (CHAT_COLORS as readonly string[]).includes(stored) ? stored : DEFAULT_CHAT_COLOR;
  const set = useCallback((next: ChatColor) => userId && threadId && setChatColor(userId, threadId, next), [userId, threadId]);
  return [color, set];
}

/* ── Name colours ── (CLAUDE.md "Messages breiter und ruhiger") */

/** Eight calm tones for the other people in a chat (tokens --name-* in globals.css, light and dark). */
export const NAME_TONES = ["blue", "teal", "green", "olive", "orange", "red", "purple", "pink"] as const;
export type NameTone = (typeof NAME_TONES)[number];

/** A tone too close to your own chat colour isn't given to anyone else (Graphite is grey – none of the eight is). */
const LIKE_OWN: Record<ChatColor, NameTone | null> = { graphite: null, ocean: "blue", sage: "green", sunset: "orange" };

/** A person's tone: stable – from their user id (a small string hash) – skipping the one like your own chat colour. */
export function nameToneOf(userId: string, own: ChatColor): NameTone {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  const allowed = NAME_TONES.filter((tone) => tone !== LIKE_OWN[own]);
  return allowed[h % allowed.length];
}

/** The CSS colour of a person's tone. */
export const nameColorOf = (userId: string, own: ChatColor) => `var(--name-${nameToneOf(userId, own)})`;

/** The open chat's own colour, for the messages inside it (their names avoid it) – ThreadContent provides it. */
export const OwnChatColorContext = createContext<ChatColor>(DEFAULT_CHAT_COLOR);
export const useOwnChatColor = () => useContext(OwnChatColorContext);

