"use client";

// Bringing people into a House – one place for who can invite and whom the invite sheet suggests (components/InviteSheet.tsx). The order:
// Your people · Saved · in for this House ("I'm in for …") · everyone else only by search. Never: the host, anyone already in or asking,
// blocked either way, or who said "Don't invite me again" to you. No friend list, no followers, no requests. Same rules on the server later.
import { useTodayIso } from "./birthDate";
import { peopleInFor } from "./inFor";
import { didntWorkOut } from "./requests";
import { isCrewMember, settingsOf, useStore } from "./store";
import type { Stay, User } from "./types";
import { openSpots } from "./utils";
import { yourPeople } from "./yourPeople";

type Store = ReturnType<typeof useStore>;

export interface InviteSuggestions {
  people: User[];
  saved: User[];
  inFor: User[];
}

/** Who can't be invited to this House by `me` (or is there already). */
function excludedFor(store: Store, me: string, stay: Stay): Set<string> {
  const mine = settingsOf(store.users.find((u) => u.id === me));
  const out = new Set<string>([me, stay.hostId, ...mine.blockedUserIds]);
  for (const r of store.joinRequests) if (r.stayId === stay.id && !didntWorkOut(r)) out.add(r.userId);
  for (const u of store.users) {
    const theirs = settingsOf(u);
    if (theirs.blockedUserIds.includes(me) || (theirs.noInvitesFrom ?? []).includes(me)) out.add(u.id);
  }
  return out;
}

/** The sheet's sections, each without the ones before it. */
export function inviteSuggestions(store: Store, me: string, stay: Stay, today: string): InviteSuggestions {
  const out = excludedFor(store, me, stay);
  const people = yourPeople(store, me)
    .map((p) => p.user)
    .filter((u) => !out.has(u.id));
  people.forEach((u) => out.add(u.id));
  const saved = (settingsOf(store.users.find((u) => u.id === me)).savedPeopleIds ?? []).flatMap((id) => (out.has(id) ? [] : (store.users.find((u) => u.id === id) ?? [])));
  saved.forEach((u) => out.add(u.id));
  const inFor = peopleInFor(store.inFor, stay, today, out).flatMap((id) => store.users.find((u) => u.id === id) ?? []);
  return { people, saved, inFor };
}

/** Everyone else, by first name – only what was typed (at least 2 letters). */
export function searchInvitees(store: Store, me: string, stay: Stay, query: string, limit = 8): User[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out = excludedFor(store, me, stay);
  return store.users.filter((u) => !out.has(u.id) && u.name.toLowerCase().split(" ")[0].startsWith(q)).slice(0, limit);
}

/** Can `me` bring people into this House right now: host or in the crew, a free spot, not started yet, open to join. */
export function canInvite(store: Store, stay: Stay | undefined, me: string | null, today: string | null): boolean {
  if (!stay || !me || !today) return false;
  if (stay.status !== "published" && stay.status !== "booked") return false;
  return isCrewMember(store, stay, me) && openSpots(stay) > 0 && stay.startDate > today;
}

/** The hook: true when the current user (host or member) can invite to this House – free spots, not started. */
export function useCanInvite(houseId: string): boolean {
  const store = useStore();
  const today = useTodayIso();
  const stay = store.stays.find((s) => s.id === houseId || s.slug === houseId);
  return canInvite(store, stay, store.currentUserId, today);
}
