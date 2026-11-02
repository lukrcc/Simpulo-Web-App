import { canChargeHostFee, maxHostFee } from "@/lib/fees";
import type { PersonEntry } from "@/lib/store";
import type { Currency, NewStayInput, Stay, User, Vibe } from "@/lib/types";
import { addDays, currencyForCountry, findUrls, languageCode, nightsBetween } from "@/lib/utils";

/*
 * Open a House – the form state and everything derived from it (no React here): the steps, defaults, validation per
 * step, the draft, templates and what gets saved to the House.
 */

export const DRAFT_KEY = "draftHouse";
export const TEMPLATES_KEY = "simpulo:house-templates";
export const HOST_NOTE_MAX = 60;
export const MAX_IDEAS = 3;
export const TITLE_MIN = 4;
/** Editing: Houses opened before the 28-character limit keep their longer titles. */
export const TITLE_MAX = 60;
/** A new House's title – short enough for the hero (the counter in the form shows it). */
export const TITLE_MAX_NEW = 28;

/** The title limit: 28 for a new House, 60 when editing one. */
export const titleMaxFor = (editing?: Stay) => (editing ? TITLE_MAX : TITLE_MAX_NEW);
export const CUSTOM_VIBE_MAX = 20;
export const LOOKING_FOR_MIN = 20;
export const LOOKING_FOR_MAX = 160;
export const MAX_NIGHTS = 120;
export const SPOTS_MIN = 2;
export const SPOTS_MAX = 16;
export const SPOTS_QUICK = [4, 6, 8, 12] as const;
export const DEFAULT_LANGUAGE = "en";

/** One question per step. "extras" is the optional one between the host experience and Publish. */
export const STEPS = ["vibe", "where", "when", "crew", "budget", "title", "pitch", "host", "extras", "publish"] as const;
export type StepKey = (typeof STEPS)[number];

/** The steps a host goes through: "host" only while host experiences are offered (feature flag hostPremium). */
export function stepsFor(hostExperience: boolean): StepKey[] {
  return hostExperience ? [...STEPS] : STEPS.filter((key) => key !== "host");
}

/** Steps that count in "Step N of 9" – the optional one doesn't. */
export const isNumbered = (key: StepKey) => key !== "extras";

export type HostExperience = "rent" | "program";

export interface FormState {
  /** "" = not picked yet */
  vibe: Vibe | "";
  /** The host's own vibe label – non-null means "+ Custom" is the pick (saved as vibe "mixed") */
  customVibe: string | null;
  /** "Bali, Indonesia" */
  region: string;
  /** The area ("Canggu"); "" = still open */
  city: string;
  startDate: string;
  endDate: string;
  spotsTotal: number;
  /** "" = default from the host's country */
  currency: Currency | "";
  budgetMin: string;
  budgetMax: string;
  /** "Decide together": no budget on the card ("Budget TBD") */
  budgetTbd: boolean;
  title: string;
  lookingForText: string;
  hostExperience: HostExperience;
  /** Per guest, with "With a program" ("" = none yet) */
  hostFee: string;
  // Make it better (optional)
  whyText: string;
  dayText: string;
  hostNote: string;
  /** Up to 3 links; posted into the crew chat on publish (create only) */
  accommodationIdeas: string[];
  /** Optional WhatsApp / Telegram invite link for the crew ("" = none) */
  crewGroupUrl: string;
  /** ISO 639-1; "" = the host's first language */
  language: string;
  /** People the host lived with, invited on publish ("Open again", "Invite to a House") */
  inviteIds: string[];
  /** "Open again": the completed House this one repeats ("" = a new one) */
  againFrom: string;
}

export const initialForm: FormState = {
  vibe: "",
  customVibe: null,
  region: "",
  city: "",
  startDate: "",
  endDate: "",
  spotsTotal: 4,
  currency: "",
  budgetMin: "",
  budgetMax: "",
  budgetTbd: false,
  title: "",
  lookingForText: "",
  hostExperience: "rent",
  hostFee: "",
  whyText: "",
  dayText: "",
  hostNote: "",
  accommodationIdeas: [""],
  crewGroupUrl: "",
  language: "",
  inviteIds: [],
  againFrom: "",
};

/** The edit page (and "Open again") start from the House as it is. */
export function formFromStay(stay: Stay): FormState {
  const budget = stay.budgetPerPerson ?? (stay.pricePerPerson ? { min: stay.pricePerPerson, max: stay.pricePerPerson } : undefined);
  return {
    ...initialForm,
    vibe: stay.vibe,
    customVibe: stay.customVibe ?? null,
    region: stay.region,
    city: stay.city,
    startDate: stay.startDate,
    endDate: stay.endDate,
    spotsTotal: stay.spotsTotal,
    currency: stay.currency,
    budgetMin: budget ? String(budget.min) : "",
    budgetMax: budget ? String(budget.max) : "",
    budgetTbd: !budget,
    title: stay.title,
    lookingForText: stay.lookingForText,
    hostExperience: stay.hostFeePerPerson ? "program" : "rent",
    hostFee: stay.hostFeePerPerson ? String(stay.hostFeePerPerson) : "",
    whyText: stay.whyText,
    dayText: stay.dayText,
    hostNote: stay.hostNote ?? "",
    crewGroupUrl: stay.crewGroupUrl ?? "",
    language: stay.language,
  };
}

/** "Open again": every field of the House that ended, new dates, and its crew (minus the host) to invite. */
export function againForm(source: Stay, crewIds: string[]): FormState {
  return {
    ...formFromStay(source),
    startDate: "",
    endDate: "",
    inviteIds: crewIds.slice(0, Math.max(0, source.spotsTotal - 1)),
    againFrom: source.id,
  };
}

/** The invites as they'll go out: only people offered (the host's People), no more than the spots besides the host's. */
export function invitesOf(form: FormState, people: PersonEntry[]): string[] {
  const offered = new Set(people.map((p) => p.user.id));
  return form.inviteIds.filter((id) => offered.has(id)).slice(0, Math.max(0, form.spotsTotal - 1));
}

/** The vibe whose suggestions (titles, starters) apply: a custom vibe uses the "mixed" ones. */
export function suggestionVibe(form: FormState): Vibe {
  return form.customVibe !== null || !form.vibe ? "mixed" : form.vibe;
}

/** The House language as saved: the host's pick, else their first language, else English. */
export function languageOf(form: FormState, me?: User): string {
  return form.language || (me?.languages.map(languageCode).find(Boolean) ?? DEFAULT_LANGUAGE);
}

/** The House currency as it will be saved: the host's pick, else the currency of their country. */
export function currencyOf(form: FormState, me?: User): Currency {
  return form.currency || currencyForCountry(me?.country ?? "");
}

/** A single http(s) link and nothing else. */
export const isLink = (value: string) => findUrls(value)[0] === value;

/** The idea links as they'll be posted: trimmed, non-empty links only (anything else is dropped, never blocks). */
export function ideasOf(form: FormState): string[] {
  return form.accommodationIdeas.map((l) => l.trim()).filter(isLink).slice(0, MAX_IDEAS);
}

/** Slider scale per currency: about €100–3000 per person in every currency, in round steps. */
export const BUDGET_SCALE: Record<Currency, { min: number; max: number; step: number; start: [number, number] }> = {
  EUR: { min: 100, max: 3000, step: 50, start: [400, 600] },
  USD: { min: 100, max: 3000, step: 50, start: [400, 650] },
  GBP: { min: 100, max: 2500, step: 50, start: [350, 500] },
  AUD: { min: 150, max: 5000, step: 50, start: [650, 1000] },
  THB: { min: 4000, max: 110_000, step: 1000, start: [15_000, 22_000] },
  IDR: { min: 1_500_000, max: 50_000_000, step: 500_000, start: [7_000_000, 10_000_000] },
};

/** The budget as saved: both ends set and in order, unless it's decided together. */
function budgetOf(form: FormState): { min: number; max: number } | undefined {
  if (form.budgetTbd) return undefined;
  const min = Math.round(Number(form.budgetMin));
  const max = Math.round(Number(form.budgetMax));
  return min > 0 && max >= min ? { min, max } : undefined;
}

/**
 * The share the 30 % host programme cap is measured against: the locked price, else the low end of the budget
 * (undefined = no budget yet – the cap applies when the place is locked).
 */
export function hostFeeBase(form: FormState, editing?: Stay): number | undefined {
  if (editing?.accommodationStatus === "locked" && editing.pricePerPerson) return editing.pricePerPerson;
  return budgetOf(form)?.min;
}

/** The host fee as saved: "With a program", a whole amount > 0, and only for hosts who may charge one. */
function hostFeeOf(form: FormState, me?: User): number | undefined {
  const fee = Math.round(Number(form.hostFee));
  return form.hostExperience === "program" && canChargeHostFee(me) && fee > 0 ? fee : undefined;
}

/** The optional fields of "Make it better" – how many are filled. */
export function extrasCount(form: FormState): number {
  return [form.whyText, form.dayText, form.hostNote, form.crewGroupUrl, ...form.accommodationIdeas].filter((v) => v.trim() !== "").length;
}

/**
 * The House as it will be saved. New Houses always go out with the place open (locking happens on the Manage
 * page); editing keeps the stay's lock (price, link, status) and the fields this form doesn't show untouched.
 */
export function toInput(form: FormState, me?: User, editing?: Stay): NewStayInput {
  const locked = editing?.accommodationStatus === "locked";
  return {
    title: form.title.trim(),
    city: form.city.trim(),
    region: form.region.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    spotsTotal: form.spotsTotal,
    vibe: form.customVibe !== null || !form.vibe ? "mixed" : form.vibe,
    customVibe: form.customVibe?.trim() || undefined,
    language: languageOf(form, me),
    currency: locked && editing ? editing.currency : currencyOf(form, me),
    pricePerPerson: editing?.pricePerPerson,
    budgetPerPerson: locked ? editing?.budgetPerPerson : budgetOf(form),
    accommodationLink: editing?.accommodationLink,
    crewGroupUrl: normalizeGroupUrl(form.crewGroupUrl) || undefined,
    accommodationStatus: editing?.accommodationStatus ?? "open",
    description: editing ? editing.description : form.whyText.trim(),
    whyText: form.whyText.trim(),
    dayText: form.dayText.trim(),
    lookingForText: form.lookingForText.trim(),
    hostNote: form.hostNote.trim() || undefined,
    hostFeePerPerson: hostFeeOf(form, me),
    interests: editing?.interests ?? [],
    houseRules: editing?.houseRules ?? [],
  };
}

/** Hosts a crew group link may point to: WhatsApp (wa.me, chat.whatsapp.com) and Telegram (t.me). */
const GROUP_HOSTS = new Set(["wa.me", "chat.whatsapp.com", "t.me"]);

/** The crew group link as saved: trimmed, https:// added when it was left out ("" = none). */
export function normalizeGroupUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** A WhatsApp or Telegram invite link (wa.me/…, chat.whatsapp.com/…, t.me/…) with something after the host. */
export function isValidGroupUrl(raw: string): boolean {
  try {
    const url = new URL(normalizeGroupUrl(raw));
    return GROUP_HOSTS.has(url.hostname.replace(/^www\./, "")) && url.pathname.length > 1;
  } catch {
    return false;
  }
}

/** Fields that can be invalid – also their DOM ids (`create-<key>`) for jumping to them. */
export type FieldKey = "vibe" | "region" | "startDate" | "endDate" | "spotsTotal" | "budget" | "title" | "lookingForText" | "hostFee" | "crewGroupUrl";

/** A field's problem: the key of its `create.errors` message. */
export type FieldError =
  | { key: "vibe" | "region" | "startDate" | "startPast" | "endDate" | "dateOrder" | "budget" | "budgetOrder" | "hostFee" | "crewGroupUrl" | "lookingFor" | "lookingForUnfinished" }
  | { key: "tooLong"; max: number }
  | { key: "titleLength"; min: number; max: number }
  | { key: "spots"; min: number; max: number }
  | { key: "hostFeeTooHigh"; max: number };

export type FieldErrors = Partial<Record<FieldKey, FieldError>>;

/** DOM id of a field. */
export const fieldId = (key: string) => `create-${key}`;

export interface ValidationContext {
  form: FormState;
  me?: User;
  minSpots: number;
  /** YYYY-MM-DD, local */
  today: string;
  editing?: Stay;
  /** The tap-to-insert starters of "Who I'm looking for" – a starter alone isn't a pitch yet */
  starters?: string[];
}

/** "Who I'm looking for" without the starters it begins with – what the host wrote themselves. */
export function ownWords(text: string, starters: string[]): string {
  let rest = text.trim();
  for (const starter of starters) {
    const s = starter.trim();
    if (s && rest.startsWith(s)) rest = rest.slice(s.length).trim();
  }
  return rest;
}

/** The earliest start: tomorrow ("" while today is unknown). */
export const earliestStart = (today: string) => (today ? addDays(today, 1) : "");

/** Today as YYYY-MM-DD in the host's time zone. */
export function todayString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** What blocks leaving a step, per field. Optional fields never block – unless what's typed is wrong. */
export function stepErrors(step: StepKey, { form, me, minSpots, today, editing, starters = [] }: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case "vibe":
      if (form.customVibe !== null ? !form.customVibe.trim() : !form.vibe) errors.vibe = { key: "vibe" };
      break;
    case "where":
      if (!form.region.trim()) errors.region = { key: "region" };
      break;
    case "when": {
      // A House that already started can still be edited without moving its start.
      const startChanged = !editing || form.startDate !== editing.startDate;
      if (!form.startDate) errors.startDate = { key: "startDate" };
      // Houses start tomorrow at the earliest ("" = clock not read yet, before hydration).
      else if (startChanged && today && form.startDate <= today) errors.startDate = { key: "startPast" };
      if (!form.endDate) errors.endDate = { key: "endDate" };
      else if (form.startDate) {
        const nights = nightsBetween(form.startDate, form.endDate);
        if (nights < 1) errors.endDate = { key: "dateOrder" };
        else if (nights > MAX_NIGHTS) errors.endDate = { key: "tooLong", max: MAX_NIGHTS };
      }
      break;
    }
    case "crew":
      if (form.spotsTotal < minSpots || form.spotsTotal > SPOTS_MAX) errors.spotsTotal = { key: "spots", min: minSpots, max: SPOTS_MAX };
      break;
    case "budget": {
      if (form.budgetTbd || editing?.accommodationStatus === "locked") break;
      const min = Number(form.budgetMin);
      const max = Number(form.budgetMax);
      if (!(min > 0) || !(max > 0)) errors.budget = { key: "budget" };
      else if (max < min) errors.budget = { key: "budgetOrder" };
      break;
    }
    case "title": {
      const title = form.title.trim().length;
      const max = titleMaxFor(editing);
      if (title < TITLE_MIN || title > max) errors.title = { key: "titleLength", min: TITLE_MIN, max };
      break;
    }
    case "pitch": {
      // The hook on cards and the Spotlight – one honest line at least.
      const text = form.lookingForText.trim();
      if (text.length < LOOKING_FOR_MIN) errors.lookingForText = { key: "lookingFor" };
      else if (ownWords(text, starters).length < 3) errors.lookingForText = { key: "lookingForUnfinished" };
      break;
    }
    case "host": {
      if (form.hostExperience !== "program" || !canChargeHostFee(me)) break;
      const fee = Math.round(Number(form.hostFee));
      const base = hostFeeBase(form, editing);
      if (!(fee > 0)) errors.hostFee = { key: "hostFee" };
      else if (base !== undefined && fee > maxHostFee(base)) errors.hostFee = { key: "hostFeeTooHigh", max: maxHostFee(base) };
      break;
    }
    case "extras":
      if (form.crewGroupUrl.trim() && !isValidGroupUrl(form.crewGroupUrl)) errors.crewGroupUrl = { key: "crewGroupUrl" };
      break;
    case "publish":
      break;
  }
  return errors;
}

// ─── Draft ─────────────────────────────────────────────────────────────────────

export interface Draft {
  form: FormState;
  step: StepKey;
}

/** Only the keys this form knows, with their defaults – older drafts and templates may carry others or miss some. */
function cleanForm(raw: object): FormState {
  const fits = (key: string, value: unknown) =>
    key === "customVibe" ? value === null || typeof value === "string" : typeof value === typeof initialForm[key as keyof FormState];
  const known = Object.entries(raw).filter(([key, value]) => key in initialForm && fits(key, value));
  const form: FormState = { ...initialForm, ...Object.fromEntries(known) };
  const ideas = form.accommodationIdeas.filter((link, i) => typeof link === "string" && (i === 0 || link.trim() !== "")).slice(0, MAX_IDEAS);
  return { ...form, accommodationIdeas: ideas.length > 0 ? ideas : [""] };
}

/** Anything typed or picked yet – an untouched form isn't worth offering as a draft. */
export function hasContent(form: FormState): boolean {
  return (Object.keys(initialForm) as Array<keyof FormState>).some((key) => JSON.stringify(form[key]) !== JSON.stringify(initialForm[key]));
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { form?: object; step?: unknown };
    const form = cleanForm(draft.form ?? {});
    if (!hasContent(form)) return null;
    const step = STEPS.find((key) => key === draft.step) ?? "vibe";
    return { form, step };
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage full or blocked – the draft just won't survive a refresh
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // nothing to clear
  }
}

// ─── Templates ("Save as template") ────────────────────────────────────────────

export interface HouseTemplate {
  id: string;
  savedAt: string;
  /** Everything but the dates and the invites */
  form: FormState;
}

const withoutDates = (form: FormState): FormState => ({ ...form, startDate: "", endDate: "", inviteIds: [], againFrom: "" });

export function readTemplates(): HouseTemplate[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((t: Partial<HouseTemplate>) => (t && typeof t.id === "string" && t.form ? [{ id: t.id, savedAt: String(t.savedAt ?? ""), form: withoutDates(cleanForm(t.form)) }] : []));
  } catch {
    return [];
  }
}

function writeTemplates(templates: HouseTemplate[]) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // not kept – the House itself is published either way
  }
}

/** Newest first; a template with the same title is replaced. At most 6 are kept. */
export function saveTemplate(form: FormState, now: Date): HouseTemplate[] {
  const template: HouseTemplate = { id: `tpl-${now.getTime()}`, savedAt: now.toISOString(), form: withoutDates(form) };
  const title = form.title.trim().toLowerCase();
  const next = [template, ...readTemplates().filter((t) => t.form.title.trim().toLowerCase() !== title)].slice(0, 6);
  writeTemplates(next);
  return next;
}

export function removeTemplate(id: string): HouseTemplate[] {
  const next = readTemplates().filter((t) => t.id !== id);
  writeTemplates(next);
  return next;
}

// ─── Prefill links ("Open one", "Open your own House", "Host your own next trip") ──────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** /create with a place and dates filled in – the flow picks them up (see prefillOf). */
export function createHref({ region, city, from, to }: { region?: string; city?: string; from?: string; to?: string }): string {
  const params = new URLSearchParams();
  if (region?.trim()) params.set("region", region.trim());
  if (city?.trim()) params.set("city", city.trim());
  if (from && ISO_DATE.test(from)) params.set("from", from);
  if (to && ISO_DATE.test(to)) params.set("to", to);
  const query = params.toString();
  return query ? `/create?${query}` : "/create";
}

/** "Open again": /create?again=<the completed House> – every field but the dates, its crew invited on publish. */
export function againHref(stayId: string): string {
  return `/create?${AGAIN_PARAM}=${encodeURIComponent(stayId)}`;
}

export const AGAIN_PARAM = "again";

/** "Invite to a House" without an open House: /create?invite=<user> – that person is invited on publish. */
export function inviteHref(userId: string): string {
  return `/create?${INVITE_PARAM}=${encodeURIComponent(userId)}`;
}

export const INVITE_PARAM = "invite";

/**
 * What a /create?region=…&from=…&to=… link fills in. A start before the earliest allowed one moves to it; an end
 * that's no longer after the start is dropped. null when the link carries nothing.
 */
export function prefillOf(search: string, today: string): Partial<FormState> | null {
  const params = new URLSearchParams(search);
  const region = params.get("region")?.trim().slice(0, 80) ?? "";
  const city = params.get("city")?.trim().slice(0, 80) ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const earliest = earliestStart(today);
  const start = ISO_DATE.test(from) ? (earliest && from < earliest ? earliest : from) : "";
  const end = ISO_DATE.test(to) && start && to > start ? to : "";
  if (!region && !city && !start) return null;
  return { ...(region && { region }), ...(city && { city }), ...(start && { startDate: start, endDate: end }) };
}
