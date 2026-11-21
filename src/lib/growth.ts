// Growth: attribution (this visit's ref/UTM, in memory), share links, analytics events and the demand/host records collected along
// the way. The records are mock (the store; saved in this browser only in dev and demo).
import type { Attribution } from "./mock";

export type { Attribution };

/** Channels a share link can be made for (the share sheet). `story` is the downloadable story image's QR code. */
export const SHARE_CHANNELS = ["whatsapp", "instagram", "tiktok", "twitch", "copy"] as const;
/** Plus the host tools (story image) and the system share dialog (navigator.share). */
export type ShareChannel = (typeof SHARE_CHANNELS)[number] | "story" | "native" | "messages" | "invite" | "hostkit" | "hostref";

export const REF_PARAM = "ref";
export const SRC_PARAM = "src";
const UTM_PARAMS = { utmSource: "utm_source", utmMedium: "utm_medium", utmCampaign: "utm_campaign" } as const;

/**
 * Where this visit came from – read once from the first URL of the page load and kept in memory only. Nothing is stored on the device
 * (CLAUDE.md "Speicherung und Tracker"): a reload after the URL was cleaned counts as direct.
 */
let touch: Attribution | null = null;

const MAX_PARAM_LENGTH = 80;
const clean = (value: string | null) => value?.trim().slice(0, MAX_PARAM_LENGTH) || undefined;

/** ref + utm_* from a URL's query, or null when it carries none. */
export function attributionFromUrl(url: URL): Attribution | null {
  // A marketing contact's demo link (?ref=mc-…, Admin › Marketing) is no person's share link: it counts as the source "creator-demo",
  // never as a referring user.
  const ref = clean(url.searchParams.get(REF_PARAM));
  // …and a partner's own link (?ref=mp-…, Admin › Marketing › Partner) counts as the source "partner", the code as the campaign.
  const contactRef = ref?.startsWith("mc-") ?? false;
  const partnerRef = ref?.startsWith("mp-") ?? false;
  const attribution: Attribution = {
    refUserId: contactRef || partnerRef ? undefined : ref,
    // ?src= (an invite: src=invite, the QR cards: src=qr) counts as the source when there's no utm_source.
    utmSource: clean(url.searchParams.get(UTM_PARAMS.utmSource) ?? url.searchParams.get(SRC_PARAM)) ?? (contactRef ? "creator-demo" : partnerRef ? "partner" : undefined),
    utmMedium: clean(url.searchParams.get(UTM_PARAMS.utmMedium)),
    utmCampaign: clean(url.searchParams.get(UTM_PARAMS.utmCampaign)) ?? (contactRef || partnerRef ? ref : undefined),
  };
  return Object.values(attribution).some(Boolean) ? withoutEmpty(attribution) : null;
}

function withoutEmpty(attribution: Attribution): Attribution {
  return Object.fromEntries(Object.entries(attribution).filter(([, v]) => v)) as Attribution;
}

/**
 * This visit's attribution ({} = came direct). The first call reads ref/UTM from the current URL and keeps it in memory – so it can run
 * from any component's effect, in any order, before the URL is cleaned.
 */
export function firstTouch(): Attribution {
  if (touch) return touch;
  try {
    touch = attributionFromUrl(new URL(window.location.href)) ?? {};
  } catch {
    touch = {};
  }
  return touch;
}

/** Takes ref and utm_* out of the address bar (after firstTouch() saw them), so they aren't shared on. */
export function stripAttributionParams() {
  try {
    const url = new URL(window.location.href);
    const keys = [REF_PARAM, ...Object.values(UTM_PARAMS)];
    if (!keys.some((key) => url.searchParams.has(key))) return;
    for (const key of keys) url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    // leave the URL as it is
  }
}

/** Only the four attribution fields of a record (requests, payments, users carry more). */
export function attributionOf(source: Attribution | undefined): Attribution {
  if (!source) return {};
  return withoutEmpty({
    refUserId: source.refUserId,
    utmSource: source.utmSource,
    utmMedium: source.utmMedium,
    utmCampaign: source.utmCampaign,
  });
}

/** The public origin for share links: NEXT_PUBLIC_SITE_URL when set, else where the app runs. */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  return typeof window === "undefined" ? "" : window.location.origin;
}

/**
 * A share link: `path` plus ?ref={sharer}&src={channel} (CLAUDE.md "Teilen und Einladen"; utm_medium/utm_campaign when given). Logged out,
 * there's no ref – the channel is still tagged. attributionFromUrl reads src as the source (utm_source still wins for outside campaigns).
 */
export function shareUrl(
  path: string,
  { refUserId, channel, medium, campaign }: { refUserId: string | null; channel: ShareChannel; medium?: string; campaign?: string },
): string {
  const url = new URL(path, siteOrigin() || "https://simpulo.app");
  if (refUserId) url.searchParams.set(REF_PARAM, refUserId);
  url.searchParams.set(SRC_PARAM, channel);
  if (medium) url.searchParams.set(UTM_PARAMS.utmMedium, medium);
  if (campaign) url.searchParams.set(UTM_PARAMS.utmCampaign, campaign);
  return url.toString();
}

// ─── Analytics ──────────────────────────────────────────────────────────────────

export type GrowthEventName =
  | "house_viewed"
  | "join_started"
  | "auth_completed"
  | "request_sent"
  | "request_accepted"
  | "payment_completed"
  | "house_published"
  | "link_shared";

/** One analytics event: what happened, about which House, and where the person came from. */
export interface GrowthEvent extends Attribution {
  id: string;
  name: GrowthEventName;
  at: string;
  houseId?: string;
  /** Who did it (logged out: unset) */
  userId?: string;
  /** link_shared: where it was shared to */
  channel?: ShareChannel;
  /** payment_completed: what the guest paid, and Simpulo's part of it (guest fee + 10 % of the host programme) */
  amount?: number;
  revenue?: number;
  currency?: string;
  /** Generated from the mock data at startup – never persisted */
  seed?: boolean;
}

/** "Notify me" on an empty Explore: tell this email when a House opens there, then. */
export interface DemandAlert {
  id: string;
  email: string;
  /** Country as filtered on Explore ("" = anywhere) */
  region: string;
  from?: string;
  to?: string;
  userId?: string;
  createdAt: string;
}

export const AUDIENCE_SIZES = ["under1k", "1k", "10k", "100k"] as const;
export type AudienceSize = (typeof AUDIENCE_SIZES)[number];

/** /host "Host with your community" application (the old page; admin › Applications uses HostApplication in lib/types.ts). */
export interface CommunityApplication {
  id: string;
  name: string;
  email: string;
  platformLinks: string[];
  audienceSize: AudienceSize;
  idea: string;
  place: string;
  from?: string;
  to?: string;
  userId?: string;
  createdAt: string;
}


/** Random URL-safe token for claim links. */
export function claimToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
}
