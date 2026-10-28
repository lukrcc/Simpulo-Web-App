// Growth: attribution (first touch), share links, analytics events and the demand/host records collected along
// the way. Mock only – everything lives in the store and in this browser's localStorage.
import type { Attribution } from "./mock";

export type { Attribution };

/** Channels a share link can be made for (the share sheet). `story` is the downloadable story image's QR code. */
export const SHARE_CHANNELS = ["whatsapp", "instagram", "tiktok", "twitch", "copy"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number] | "story";

export const REF_PARAM = "ref";
const UTM_PARAMS = { utmSource: "utm_source", utmMedium: "utm_medium", utmCampaign: "utm_campaign" } as const;

/** First touch of this browser: written once, on the first visit that carried a ref or UTM tags. */
const FIRST_TOUCH_KEY = "simpulo:first-touch";

const MAX_PARAM_LENGTH = 80;
const clean = (value: string | null) => value?.trim().slice(0, MAX_PARAM_LENGTH) || undefined;

/** ref + utm_* from a URL's query, or null when it carries none. */
export function attributionFromUrl(url: URL): Attribution | null {
  const attribution: Attribution = {
    refUserId: clean(url.searchParams.get(REF_PARAM)),
    utmSource: clean(url.searchParams.get(UTM_PARAMS.utmSource)),
    utmMedium: clean(url.searchParams.get(UTM_PARAMS.utmMedium)),
    utmCampaign: clean(url.searchParams.get(UTM_PARAMS.utmCampaign)),
  };
  return Object.values(attribution).some(Boolean) ? withoutEmpty(attribution) : null;
}

function withoutEmpty(attribution: Attribution): Attribution {
  return Object.fromEntries(Object.entries(attribution).filter(([, v]) => v)) as Attribution;
}

/**
 * The browser's first-touch attribution ({} = came direct). The first call that sees a ref/UTM in the current
 * URL stores it – so it can run from any component's effect, in any order, before the URL is cleaned.
 */
export function firstTouch(): Attribution {
  try {
    const stored = localStorage.getItem(FIRST_TOUCH_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
    const fromUrl = attributionFromUrl(new URL(window.location.href));
    if (!fromUrl) return {};
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(fromUrl));
    return fromUrl;
  } catch {
    // storage unavailable: attribute this page view from the URL, nothing is remembered
    try {
      return attributionFromUrl(new URL(window.location.href)) ?? {};
    } catch {
      return {};
    }
  }
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
 * A share link: `path` plus ?ref={sharer}&utm_source={channel} (and utm_medium/utm_campaign when given).
 * Logged out, there's no ref – the channel is still tagged.
 */
export function shareUrl(
  path: string,
  { refUserId, channel, medium, campaign }: { refUserId: string | null; channel: ShareChannel; medium?: string; campaign?: string },
): string {
  const url = new URL(path, siteOrigin() || "https://simpulo.app");
  if (refUserId) url.searchParams.set(REF_PARAM, refUserId);
  url.searchParams.set(UTM_PARAMS.utmSource, channel);
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
  /** payment_completed: what the guest paid, and Simpulo's part of it (guest fee + 20 % of the host programme) */
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

/** /host "Host with your community" application. */
export interface HostApplication {
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

/** The admin pages (/admin/…): always in development; in a deployment only with NEXT_PUBLIC_ADMIN=true. */
export const ADMIN_ENABLED = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ADMIN === "true";

/** Random URL-safe token for claim links. */
export function claimToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
}
