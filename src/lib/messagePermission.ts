// "Who can message me" (Settings › Privacy & safety, CLAUDE.md "Settings"): a direct chat always belongs to a House (DIRECT_MESSAGE_POLICY);
// this decides who may start one with you. Pure – the store's openDirectThread and the House page's "Ask a question" both ask it.
//   afterRequest (default) – "Everyone after a request": anyone with a question about your House, and the hosts you asked to join
//   people                 – "Your people": only your people and people you share a House with (and hosts you asked)
//   crew                   – "Crew only": only people you share a House with (and hosts you asked)
// A host you sent a request to can always answer it – that's yours to start.
import type { JoinRequest, LivedWith, Stay, User } from "./types";

export type MessagePermission = "crew" | "people" | "afterRequest";
export const MESSAGE_PERMISSIONS: readonly MessagePermission[] = ["crew", "people", "afterRequest"];
export const DEFAULT_MESSAGE_PERMISSION: MessagePermission = "afterRequest";

type Data = { users: readonly User[]; stays: readonly Stay[]; joinRequests: readonly JoinRequest[]; livedWith: readonly LivedWith[] };

export const messagePermissionOf = (user: Pick<User, "privacy"> | undefined): MessagePermission => user?.privacy?.messages ?? DEFAULT_MESSAGE_PERMISSION;

const inHouse = (data: Data, stay: Stay, id: string) => stay.hostId === id || data.joinRequests.some((r) => r.stayId === stay.id && r.userId === id && r.status === "accepted");
/** In a House together (host or accepted), any House. */
export const shareAHouse = (data: Data, a: string, b: string) => data.stays.some((s) => inHouse(data, s, a) && inHouse(data, s, b));
const confirmed = (data: Data, a: string, b: string) => data.livedWith.some((l) => l.userId === a && l.otherUserId === b && l.confirmedAt);

/** May `from` start a direct chat with `to` about this House? (Blocking is checked by the caller.) */
export function canMessage(data: Data, from: string, to: string, stay: Stay): boolean {
  // `to` asked to join `from`'s House: the host may always answer.
  if (stay.hostId === from && data.joinRequests.some((r) => r.stayId === stay.id && r.userId === to)) return true;
  const rule = messagePermissionOf(data.users.find((u) => u.id === to));
  if (shareAHouse(data, from, to)) return true;
  if (rule === "crew") return false;
  if (rule === "people") return confirmed(data, from, to) && confirmed(data, to, from);
  // afterRequest: a question to the host about their House.
  return stay.hostId === to;
}
