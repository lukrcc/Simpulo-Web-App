"use client";

import { crewFaceMode, type CrewFaceMode } from "@/config/privacy";
import { isCrewMember, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";

/**
 * How each person of this House's crew appears to the current viewer (config/privacy.ts): the host and the crew see everyone in full;
 * other signed-in members see photo + first name, or nothing for someone who turned it off; logged out, every face is blurred.
 */
export function useCrewFaceOf(stay: Pick<Stay, "id" | "hostId">): (user: Pick<User, "id" | "privacy">) => CrewFaceMode {
  const store = useStore();
  const me = store.currentUserId;
  const inCrew = me !== null && isCrewMember(store, stay as Stay, me);
  return (user) => crewFaceMode(user, { id: me, inCrew }, user.id === stay.hostId);
}
