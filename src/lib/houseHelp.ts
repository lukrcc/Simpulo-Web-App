// Admin › Houses – the four levers for a House that needs help (CLAUDE.md "Admin › Houses"), as pure functions over the data:
// Sichtbarkeit (a time-limited ranking bonus in Explore), Nachfrage (who may be told about it – with consent, once a day), Host helfen (the
// comparison with similar full Houses and the tips that follow from it) and Ausweichen (move the dates or join a similar House – only a
// suggestion to the host; guests agree or are refunded). Plus what happened after an action (did the House fill?).
import { DEFAULT_NOTIFICATION_PREFS } from "@/config/notifications";
import { HIGHLIGHT_POLICY } from "@/config/policies";
import { convert, isCurrency } from "./currency";
import { inForMatches, type InFor } from "./inFor";
import { medianReplyMinutes } from "./profilePrivacy";
import { waitlistStatus, type HostHelpItem, type Stay, type User, type WaitlistEntry } from "./types";

const DAY_MS = 86_400_000;
const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = xs.toSorted((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const isOpen = (s: Stay) => s.status === "published" && !s.isExample;
const isFull = (s: Stay) => s.spotsTotal > 0 && s.spotsFilled >= s.spotsTotal;
const sameHub = (a: Stay, b: Stay) => (a.location?.city ?? a.city).toLowerCase() === (b.location?.city ?? b.city).toLowerCase();

// ── Sichtbarkeit ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const isBoosted = (stay: Pick<Stay, "boostUntil">, now: number) => Boolean(stay.boostUntil && Date.parse(stay.boostUntil) > now);

/** Explore's default order moves a boosted House up – as if it started HIGHLIGHT_POLICY.rankShiftDays earlier. */
export const boostShiftDays = (stay: Pick<Stay, "boostUntil">, now: number) => (isBoosted(stay, now) ? -HIGHLIGHT_POLICY.rankShiftDays : 0);

/** How many Houses are boosted right now (at most HIGHLIGHT_POLICY.maxConcurrent). */
export const activeBoosts = (stays: readonly Stay[], now: number) => stays.filter((s) => isBoosted(s, now));

/** Its place in Explore's default order (soonest first, without personal shifts) – with the boost as it is, and without one. 1 = first. */
export function exploreRank(stays: readonly Stay[], stay: Stay, now: number): { now: number; without: number; boosted: number } {
  const open = stays.filter((s) => isOpen(s) && s.startDate >= new Date(now).toISOString().slice(0, 10));
  const order = (shift: (s: Stay) => number) =>
    open.toSorted((a, b) => Date.parse(a.startDate) + shift(a) * DAY_MS - (Date.parse(b.startDate) + shift(b) * DAY_MS) || a.startDate.localeCompare(b.startDate)).findIndex((s) => s.id === stay.id) + 1;
  return {
    now: order((s) => boostShiftDays(s, now)),
    without: order((s) => (s.id === stay.id ? 0 : boostShiftDays(s, now))),
    boosted: order((s) => (s.id === stay.id ? -HIGHLIGHT_POLICY.rankShiftDays : boostShiftDays(s, now))),
  };
}

// ── Nachfrage ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface NudgeAudience {
  /** Confirmed waitlist sign-ups into its topic, with no place or its city (by email) */
  waitlist: string[];
  /** Accounts in for this place, month and topic (I'm in for) */
  inFor: string[];
  /** Accounts that saved this House */
  saved: string[];
  /** Everyone once (an account in two lists counts once) */
  total: number;
  /** Left out because they already got one today (NUDGE_POLICY) */
  alreadyToday: number;
}

/** "New Houses for your searches" on (push or email) – the consent to be told about a House. */
const consents = (u: User) => {
  const p = { ...DEFAULT_NOTIFICATION_PREFS.nearby, ...u.settings?.notifications?.nearby };
  return p.push || p.email;
};

/**
 * Who may be told about this House: confirmed waitlist sign-ups (topic, and its city or none), people in for it (lib/inFor.ts) and those who
 * saved it – only with consent, never the host or anyone already in it or asking, and nobody who got such a message today (`nudgedToday`:
 * account ids or emails). "Angesehen" isn't stored anywhere, so it isn't a source.
 */
export function nudgeAudience(stay: Stay, data: { users: readonly User[]; waitlist: readonly WaitlistEntry[]; inFor: readonly InFor[]; involved: ReadonlySet<string>; nudgedToday: ReadonlySet<string>; today: string }): NudgeAudience {
  const city = (stay.location?.city ?? stay.city).toLowerCase();
  const ok = (id: string) => !data.involved.has(id) && id !== stay.hostId;
  const account = (id: string) => data.users.find((u) => u.id === id);
  const wl = data.waitlist.filter((e) => waitlistStatus(e) === "confirmed" && e.consent && e.interests.includes(stay.vibe) && (!e.where || e.where.toLowerCase() === city || e.where.toLowerCase() === stay.city.toLowerCase())).map((e) => e.userId ?? e.email.toLowerCase());
  const inForIds = [...new Set(data.inFor.filter((i) => i.monthTo >= data.today.slice(0, 7) && inForMatches(i, { ...stay, vibe: stay.vibe })).map((i) => i.userId))];
  const savedIds = data.users.filter((u) => u.savedStayIds?.includes(stay.id)).map((u) => u.id);
  const allowed = (id: string) => ok(id) && (account(id) ? consents(account(id)!) : true);
  const fresh = (id: string) => !data.nudgedToday.has(id);
  const all = [...new Set([...wl, ...inForIds, ...savedIds].filter(allowed))];
  const keep = (list: string[]) => [...new Set(list.filter((id) => allowed(id) && fresh(id)))];
  return { waitlist: keep(wl), inFor: keep(inForIds), saved: keep(savedIds), total: all.filter(fresh).length, alreadyToday: all.filter((id) => !fresh(id)).length };
}

// ── Host helfen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface HostComparisonRow {
  key: HostHelpItem;
  /** This House */
  value: number | null;
  /** The similar full Houses' median */
  median: number | null;
  /** This one falls behind – the tip that follows */
  behind: boolean;
}

const eurPrice = (s: Stay) => {
  const amount = s.pricePerPerson ?? s.budgetPerPerson?.min ?? null;
  return amount === null ? null : Math.round(isCurrency(s.currency) ? convert(amount, s.currency, "EUR") : amount);
};
const textLength = (s: Stay) => (s.whyText ?? "").length + (s.description ?? "").length + (s.lookingForText ?? "").length;

/**
 * This House against similar full ones (same topic in the same city – or else the same topic anywhere): price per person (EUR), photos, the
 * length of its texts and the host's median answer time (hours). `behind`: price over 15 % above, fewer photos, under 60 % of the text, answers
 * slower by half again. Without similar full Houses there's nothing to compare – `similar` is 0.
 */
export function hostComparison(stay: Stay, stays: readonly Stay[], users: readonly User[]): { similar: number; rows: HostComparisonRow[] } {
  const full = stays.filter((s) => s.id !== stay.id && !s.isExample && isFull(s) && s.vibe === stay.vibe);
  const near = full.filter((s) => sameHub(s, stay));
  const pool = near.length >= 2 ? near : full;
  const answer = (s: Stay) => {
    const m = medianReplyMinutes(users.find((u) => u.id === s.hostId) ?? {});
    return m === null ? null : Math.max(1, Math.round(m / 60));
  };
  const nums = (f: (s: Stay) => number | null) => pool.map(f).filter((v): v is number => v !== null);
  const rows: HostComparisonRow[] = [
    { key: "price", value: eurPrice(stay), median: median(nums(eurPrice)), behind: false },
    { key: "photos", value: stay.photos?.length ?? 0, median: median(nums((s) => s.photos?.length ?? 0)), behind: false },
    { key: "text", value: textLength(stay), median: median(nums(textLength)), behind: false },
    { key: "answers", value: answer(stay), median: median(nums(answer)), behind: false },
  ];
  for (const r of rows) {
    if (r.value === null || r.median === null) continue;
    r.behind = r.key === "price" ? r.value > r.median * 1.15 : r.key === "photos" ? r.value < r.median : r.key === "text" ? r.value < r.median * 0.6 : r.value > r.median * 1.5;
  }
  return { similar: pool.length, rows };
}

// ── Ausweichen ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * What to suggest: the same dates a month later, and – if there is one – a similar open House to join (same topic and city, starting within
 * 30 days of it, with room for everyone already in this one).
 */
export function alternativeFor(stay: Stay, stays: readonly Stay[]): { later: { start: string; end: string }; join: Stay | null } {
  const shift = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 10);
  };
  const guests = Math.max(0, stay.spotsFilled - 1);
  const join =
    stays
      .filter((s) => s.id !== stay.id && isOpen(s) && s.vibe === stay.vibe && sameHub(s, stay) && Math.abs(Date.parse(s.startDate) - Date.parse(stay.startDate)) <= 30 * DAY_MS && s.spotsTotal - s.spotsFilled >= guests + 1)
      .toSorted((a, b) => Math.abs(Date.parse(a.startDate) - Date.parse(stay.startDate)) - Math.abs(Date.parse(b.startDate) - Date.parse(stay.startDate)))[0] ?? null;
  return { later: { start: shift(stay.startDate), end: shift(stay.endDate) }, join };
}

// ── What happened after an action ────────────────────────────────────────────────────────────────────────────────────────────────

export interface HouseAction {
  id: string;
  stayId: string;
  lever: "visibility" | "demand" | "host" | "alternative" | "quote" | "content";
  /** ISO */
  at: string;
  /** Spots filled when it was done */
  filledAt: number;
  total: number;
  /** How many were reached (Nachfrage) */
  reached?: number;
}

/** The result so far: full · +N spots · unchanged – the ground for later automation. */
export function actionOutcome(action: HouseAction, stay: Pick<Stay, "spotsFilled" | "spotsTotal"> | undefined): { kind: "full" | "more" | "same" | "gone"; gained: number } {
  if (!stay) return { kind: "gone", gained: 0 };
  const gained = stay.spotsFilled - action.filledAt;
  if (stay.spotsTotal > 0 && stay.spotsFilled >= stay.spotsTotal) return { kind: "full", gained };
  return gained > 0 ? { kind: "more", gained } : { kind: "same", gained: 0 };
}
