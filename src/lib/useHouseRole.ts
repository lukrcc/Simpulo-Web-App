"use client";

// Who's looking at a House page (/h/[id]): a visitor, a member (requested, accepted, paying or paid – the guest's way through it), or its host.
// One hook, from the store (mock data now); the page shows each its own head.
import { memberStage, type MemberStage } from "./joinFlow";
import { useStore } from "./store";
import { useDevSetting } from "./devSettings";

export type HouseRole = "visitor" | "member" | "host";

export function useHouseRole(id: string): { role: HouseRole; stage: MemberStage | null } {
  const store = useStore();
  // Dev menu "House role" (dev only, always "auto" elsewhere): this view, whatever the real role is.
  const override = useDevSetting("houseRole");
  const real = realRole(store, id);
  if (override === "auto") return real;
  if (override === "member") return { role: "member", stage: real.stage ?? "requested" };
  return { role: override, stage: null };
}

function realRole(store: ReturnType<typeof useStore>, id: string): { role: HouseRole; stage: MemberStage | null } {
  const stay = store.stays.find((s) => s.id === id || s.slug === id);
  if (!stay || !store.currentUserId) return { role: "visitor", stage: null };
  if (stay.hostId === store.currentUserId) return { role: "host", stage: null };
  const stage = memberStage(store, stay, store.currentUserId);
  return { role: stage ? "member" : "visitor", stage };
}
