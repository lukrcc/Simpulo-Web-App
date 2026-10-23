import type { PrivateContacts, User } from "@/lib/types";

/** Public links – labels `create.socials.<key>`, placeholders `create.socialPlaceholders.<placeholder>`. */
export const SOCIAL_FIELDS = [
  { key: "instagram", placeholder: "handle" },
  { key: "tiktok", placeholder: "handle" },
  { key: "youtube", placeholder: "handle" },
  { key: "twitch", placeholder: "username" },
  { key: "kick", placeholder: "username" },
  { key: "linkedin", placeholder: "profileName" },
  { key: "x", placeholder: "handle" },
  { key: "threads", placeholder: "handle" },
  { key: "website", placeholder: "url" },
] as const satisfies ReadonlyArray<{ key: keyof User; placeholder: string }>;
export type SocialKey = (typeof SOCIAL_FIELDS)[number]["key"];

/** Crew-only channels – labels `common.ui.crewContacts.channel.<key>`, placeholders `create.contactPlaceholders.<key>`. */
export const CONTACT_FIELDS = ["whatsapp", "telegram", "signal", "discord", "phone", "facetime"] as const satisfies ReadonlyArray<
  keyof PrivateContacts
>;

/** Phone-like channels get a numeric keyboard on mobile. */
export const contactInputMode = (key: (typeof CONTACT_FIELDS)[number]) =>
  key === "telegram" || key === "discord" || key === "facetime" ? "text" : "tel";

/** Host part of each network's profile URLs – a pasted link becomes the bare handle. */
const SOCIAL_HOSTS: Partial<Record<SocialKey, RegExp>> = {
  instagram: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/@?([^/?#]+)/i,
  tiktok: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([^/?#]+)/i,
  youtube: /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(@[^/?#]+)/i,
  twitch: /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([^/?#]+)/i,
  kick: /^(?:https?:\/\/)?(?:www\.)?kick\.com\/([^/?#]+)/i,
  linkedin: /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#]+)/i,
  x: /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/@?([^/?#]+)/i,
  threads: /^(?:https?:\/\/)?(?:www\.)?threads\.(?:net|com)\/@([^/?#]+)/i,
};

/** Handles or full URLs in, what the profile stores out: a bare handle ("@name" for YouTube), or an https URL. */
export function normalizeSocial(key: SocialKey, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (key === "website") return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const match = SOCIAL_HOSTS[key]?.exec(value);
  const handle = (match ? match[1] : value).replace(/\/+$/, "");
  if (key === "youtube") return handle.startsWith("@") ? handle : `@${handle}`;
  return handle.replace(/^@/, "");
}

/** Phone-like channels keep digits and a leading +; Telegram drops t.me/ and @; the rest is kept as typed. */
export function normalizeContact(key: (typeof CONTACT_FIELDS)[number], raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (key === "whatsapp" || key === "signal" || key === "phone") return value.replace(/(?!^\+)[^\d]/g, "");
  if (key === "telegram") return value.replace(/^(?:https?:\/\/)?t\.me\//i, "").replace(/^@/, "");
  return value;
}
