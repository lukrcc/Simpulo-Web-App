"use client";

// Who's looking at a House page (/h/[id]): a visitor, a member (requested, accepted, paying or paid – the guest's way through it), or its host.
// One hook, from the store (mock data now); the page shows each its own head.
import { memberStage, type MemberStage } from "./joinFlow";
import { useStore } from "./store";

export type HouseRole = "visitor" | "member" | "host";

export function useHouseRole(id: string): { role: HouseRole; stage: MemberStage | null } {
  const store = useStore();
  const stay = store.stays.find((s) => s.id === id || s.slug === id);
  if (!stay || !store.currentUserId) return { role: "visitor", stage: null };
  if (stay.hostId === store.currentUserId) return { role: "host", stage: null };
  const stage = memberStage(store, stay, store.currentUserId);
  return { role: stage ? "member" : "visitor", stage };
}
