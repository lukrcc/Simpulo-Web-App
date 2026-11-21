// The public form (/report-content): what a pasted link points at here – a House (/house/{slug}, /h/{id}), a profile (/u/{profile id}) –
// or just a link (anything else; the admin sees it as given).
import { userByProfileId } from "./privacy";
import type { Report, Stay, User } from "./types";

export function resolveContentLink(link: string, stays: readonly Stay[], users: readonly User[]): Pick<Report, "target" | "subjectId" | "stayId"> {
  let path = "";
  try {
    path = new URL(link.trim(), "https://simpulo.app").pathname;
  } catch {
    path = "";
  }
  const house = /^\/(?:house|h)\/([^/?#]+)/.exec(path)?.[1];
  const stay = house ? stays.find((s) => s.slug === house || s.id === house) : undefined;
  if (stay) return { target: { kind: "stay", id: stay.id }, subjectId: stay.hostId, stayId: stay.id };
  const profile = /^\/u\/([^/?#]+)/.exec(path)?.[1];
  const user = profile ? userByProfileId(users, profile) : undefined;
  if (user) return { target: { kind: "user", id: user.id }, subjectId: user.id };
  return { target: { kind: "link", id: link.trim().slice(0, 500) } };
}

/** The form's reasons (the app's report sheet has its own five). */
export const CONTENT_REASONS = ["illegal", "scam", "harassment", "privacy", "ip", "other"] as const;
