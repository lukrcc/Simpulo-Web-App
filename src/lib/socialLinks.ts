// Public profile links: what a host can link to, how a link is stored and the URL built from it. Hosts type a handle
// (a pasted profile URL works too – it's cut down to the handle); a website is a full URL and must be a valid one.
import type { SocialLink, SocialPlatform } from "./types";

/** The platforms, in the order the "add a link" choice lists them. */
export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ["instagram", "tiktok", "youtube", "twitch", "kick", "x", "website"];

/** At most this many links per profile. */
export const MAX_SOCIAL_LINKS = 4;

/** Profile URL per platform, built from the bare handle. */
const PROFILE_URL: Record<Exclude<SocialPlatform, "website">, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  twitch: (h) => `https://www.twitch.tv/${h}`,
  kick: (h) => `https://kick.com/${h}`,
  x: (h) => `https://x.com/${h}`,
};

/** Shown in front of the handle field ("instagram.com/") – the URL the handle completes. */
export const HANDLE_PREFIX: Record<Exclude<SocialPlatform, "website">, string> = {
  instagram: "instagram.com/",
  tiktok: "tiktok.com/@",
  youtube: "youtube.com/@",
  twitch: "twitch.tv/",
  kick: "kick.com/",
  x: "x.com/",
};

/** A pasted profile URL → its handle. */
const URL_HANDLE: Record<Exclude<SocialPlatform, "website">, RegExp> = {
  instagram: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/@?([^/?#]+)/i,
  tiktok: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([^/?#]+)/i,
  youtube: /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/@?([^/?#]+)/i,
  twitch: /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([^/?#]+)/i,
  kick: /^(?:https?:\/\/)?(?:www\.)?kick\.com\/([^/?#]+)/i,
  x: /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/@?([^/?#]+)/i,
};

/** The link's URL – what profiles open in a new tab. */
export function socialUrl(link: SocialLink): string {
  return link.platform === "website" ? link.value : PROFILE_URL[link.platform](link.value);
}

/**
 * What's stored for a typed value: the bare handle (no "@", no URL around it), or – for a website – the URL with
 * https:// added when it was left out. "" when nothing usable was typed.
 */
export function normalizeSocialValue(platform: SocialPlatform, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (platform === "website") return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const match = URL_HANDLE[platform].exec(value);
  return (match ? match[1] : value).replace(/^@/, "").replace(/\/+$/, "");
}

/** A website link must be a real http(s) URL with a domain (a dot in the host name). */
export function isValidWebsite(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && /\.[a-z]{2,}$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

/** A handle: letters, digits, dot, underscore, hyphen – what the platforms allow (roughly). */
export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9._-]{1,40}$/i.test(handle);
}
