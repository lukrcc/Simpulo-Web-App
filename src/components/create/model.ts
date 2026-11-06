import { WAITLIST_MAX_DEFAULT, waitlistMaxOf } from "@/lib/waitlist";
import { placeById, placeKindOf } from "@/lib/data/places";
import { canChargeHostFee, maxHostFee } from "@/lib/fees";
import { openVote } from "@/lib/crewVotes";
import type { SearchPlace } from "@/lib/savedSearches";
import type { PersonEntry } from "@/lib/store";
import type { CrewVote, Currency, NewStayInput, Stay, User, Vibe, VoteOption } from "@/lib/types";
import { LANGUAGES, VIBES, addDays, currencyForCountry, findUrls, languageCode, nightsBetween } from "@/lib/utils";

/*
 * Open a House – the form state and everything derived from it (no React here): four required steps, the optional details,
 * defaults, validation, the draft, templates and what gets saved to the House.
 */

export const DRAFT_KEY = "draftHouse";
export const TEMPLATES_KEY = "simpulo:house-templates";
export const HOST_NOTE_MAX = 60;
/** "Decide with crew": at most this many proposals. */
export const MAX_PROPOSALS = 3;
export const TITLE_MIN = 4;
/** Editing: Houses opened before the 28-character limit keep their longer titles. */
export const TITLE_MAX = 60;
/** A new House's title (the counter in the form shows it). */
export const TITLE_MAX_NEW = 40;

/** The title limit: 40 for a new House, 60 when editing one. */
export const titleMaxFor = (editing?: Stay) => (editing ? TITLE_MAX : TITLE_MAX_NEW);
export const CUSTOM_VIBE_MAX = 20;
export const LOOKING_FOR_MIN = 20;
export const LOOKING_FOR_MAX = 160;
export const MAX_NIGHTS = 120;
export const SPOTS_MIN = 2;
/** Everyone in the House, the host included */
export const SPOTS_MAX = 10;
/** A new House's size: a range, and the crew is complete at its top end (exact on the edit page). */
export const SPOTS_QUICK = [4, 6, 8, 12] as const;
export const DEFAULT_LANGUAGE = "en";

/** Required: all it takes to open a House. */
export const REQUIRED_STEPS = ["vibe", "where", "crew", "cover"] as const;
/** Editing lists these on top: a House's cover and title are details there, and older Houses may have neither. */
export const EDIT_REQUIRED_STEPS = ["vibe", "where", "crew"] as const;
/** Up to this many photos on "Pick a cover"; the first is the cover. */
export const MAX_COVER_PHOTOS = 6;
/** Optional, one screen each, reached from the "details" list – before or after opening. */
export const DETAIL_STEPS = ["title", "photos", "why", "dates", "accommodation", "host", "lookingFor", "rules", "languages", "crewGroup"] as const;
export const STEPS = [...REQUIRED_STEPS, "ready", "details", ...DETAIL_STEPS] as const;
export type StepKey = (typeof STEPS)[number];
export type DetailKey = (typeof DETAIL_STEPS)[number];

/** The details a host can add: "host" only while host experiences are offered (feature flag hostPremium). */
export function detailsFor(hostExperience: boolean): DetailKey[] {
  return DETAIL_STEPS.filter((key) => hostExperience || key !== "host");
}

/** The optional list on "Ready to open?", grouped. Title and photos are step 4 by then. */
export const OPTIONAL_GROUPS = [
  { key: "about", details: ["why", "lookingFor", "rules", "languages"] },
  { key: "place", details: ["dates", "accommodation"] },
  { key: "extras", details: ["host", "crewGroup"] },
] as const satisfies ReadonlyArray<{ key: string; details: readonly DetailKey[] }>;

export const isDetail = (key: StepKey): key is DetailKey => (DETAIL_STEPS as readonly string[]).includes(key);

export type HostExperience = "rent" | "program";
/** "month": only the month is settled · "exact": the host's dates · "crew": the crew votes on proposals */
export type DatesMode = "month" | "exact" | "crew";
/** "later": the host locks a place on the Manage page · "crew": the crew votes on proposals */
export type AccommodationMode = "later" | "crew";
export interface DateProposal {
  id: string;
  start: string;
  end: string;
}
export interface PlaceProposal {
  id: string;
  link: string;
  /** Per person, as typed */
  price: string;
}

export interface FormState {
  /** "" = not picked yet */
  vibe: Vibe | "";
  /** The host's own vibe label – non-null means "+ Custom" is the pick (saved as vibe "social") */
  customVibe: string | null;
  /** "Bali, Indonesia" */
  region: string;
  /** The area ("Canggu"); "" = still open */
  city: string;
  /** "2027-03" */
  month: string;
  datesMode: DatesMode;
  /** With datesMode "exact" */
  startDate: string;
  endDate: string;
  dateProposals: DateProposal[];
  /** YYYY-MM-DD, optional: the last day to vote */
  datesDeadline: string;
  accommodationMode: AccommodationMode;
  placeProposals: PlaceProposal[];
  accommodationDeadline: string;
  spotsTotal: number;
  /** Places on the waitlist once the House is full, 0–5 (src/lib/waitlist.ts) */
  waitlistMax: number;
  /** Only ID-verified guests can request */
  verifiedGuestsOnly: boolean;
  /** Optional: the host's own photo of the place, for when the link has none ("" = none) */
  accommodationPhoto: string;
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
  /** One rule per line */
  rulesText: string;
  /** Theme photos; the first is the cover */
  photos: string[];
  /** Optional WhatsApp / Telegram invite link for the crew ("" = none) */
  crewGroupUrl: string;
  /** English names ("German"); none = the host's first language */
  languages: string[];
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
  month: "",
  datesMode: "month",
  startDate: "",
  endDate: "",
  dateProposals: [],
  datesDeadline: "",
  accommodationMode: "later",
  placeProposals: [],
  accommodationDeadline: "",
  spotsTotal: 4,
  waitlistMax: WAITLIST_MAX_DEFAULT,
  verifiedGuestsOnly: false,
  accommodationPhoto: "",
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
  rulesText: "",
  photos: [],
  crewGroupUrl: "",
  languages: [],
  inviteIds: [],
  againFrom: "",
};

/** The edit page (and "Open again") start from the House as it is. */
export function formFromStay(stay: Stay): FormState {
  const budget = stay.budgetPerPerson ?? (stay.pricePerPerson ? { min: stay.pricePerPerson, max: stay.pricePerPerson } : undefined);
  const datesVote = openVote(stay, "dates");
  const placeVote = openVote(stay, "accommodation");
  const nameOf = (code: string) => LANGUAGES.find((l) => l.code === code)?.name;
  return {
    ...initialForm,
    month: stay.startDate.slice(0, 7),
    datesMode: datesVote ? "crew" : stay.datesOpen ? "month" : "exact",
    dateProposals: datesVote?.options.map((o) => ({ id: o.id, start: o.startDate ?? "", end: o.endDate ?? "" })) ?? [],
    datesDeadline: datesVote?.deadline ?? "",
    accommodationMode: placeVote ? "crew" : "later",
    placeProposals: placeVote?.options.map((o) => ({ id: o.id, link: o.link ?? "", price: String(o.pricePerPerson ?? "") })) ?? [],
    accommodationDeadline: placeVote?.deadline ?? "",
    rulesText: stay.houseRules.join("\n"),
    photos: stay.photos ?? [],
    languages: [stay.language, ...(stay.languages ?? [])].flatMap((code) => nameOf(code) ?? []),
    vibe: stay.vibe,
    customVibe: stay.customVibe ?? null,
    region: stay.region,
    city: stay.city,
    startDate: stay.startDate,
    endDate: stay.endDate,
    spotsTotal: stay.spotsTotal,
    waitlistMax: waitlistMaxOf(stay),
    verifiedGuestsOnly: Boolean(stay.verifiedGuestsOnly),
    accommodationPhoto: stay.accommodationPhoto ?? "",
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
  };
}

/** "Open again": every field of the House that ended, new dates, and its crew (minus the host) to invite. */
export function againForm(source: Stay, crewIds: string[]): FormState {
  return {
    ...formFromStay(source),
    month: "",
    datesMode: "month",
    startDate: "",
    endDate: "",
    dateProposals: [],
    datesDeadline: "",
    accommodationMode: "later",
    placeProposals: [],
    accommodationDeadline: "",
    inviteIds: crewIds.slice(0, Math.max(0, source.spotsTotal - 1)),
    againFrom: source.id,
  };
}

/** The invites as they'll go out: only people offered (the host's People), no more than the spots besides the host's. */
export function invitesOf(form: FormState, people: PersonEntry[]): string[] {
  const offered = new Set(people.map((p) => p.user.id));
  return form.inviteIds.filter((id) => offered.has(id)).slice(0, Math.max(0, form.spotsTotal - 1));
}

/** The vibe whose suggestions (titles, starters) apply: a custom vibe uses the "social" ones. */
export function suggestionVibe(form: FormState): Vibe {
  return form.customVibe !== null || !form.vibe ? "social" : form.vibe;
}

/** The House language as saved: the host's pick, else their first language, else English. */
export function languageOf(form: FormState, me?: User): string {
  return form.languages.map(languageCode).find(Boolean) ?? me?.languages.map(languageCode).find(Boolean) ?? DEFAULT_LANGUAGE;
}

/** The House currency as it will be saved: the host's pick, else theirs (profile, then browser), else their country's. */
export function currencyOf(form: FormState, me?: User, preferred?: Currency | null): Currency {
  return form.currency || preferred || currencyForCountry(me?.country ?? "");
}

/** A single http(s) link and nothing else. */
export const isLink = (value: string) => findUrls(value)[0] === value;

/** A month's first and last day, the start no earlier than tomorrow (a House still has to lie ahead). */
export function monthBounds(month: string, today: string): { start: string; end: string } {
  if (!month) return { start: "", end: "" };
  const { from, to } = monthRange(month);
  const earliest = earliestStart(today);
  const start = earliest && from < earliest ? earliest : from;
  return { start, end: to > start ? to : addDays(start, 1) };
}

/** The proposals as a vote; anyone who already voted keeps their vote. */
function voteOf(options: Array<Omit<VoteOption, "voterIds">>, deadline: string, previous?: CrewVote): CrewVote | undefined {
  if (options.length === 0) return undefined;
  return {
    ...previous,
    deadline: deadline || undefined,
    options: options.map((option) => ({ ...option, voterIds: previous?.options.find((o) => o.id === option.id)?.voterIds ?? [] })),
  };
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

/** Whether an optional detail has been added – its check in the list. */
export function detailDone(key: DetailKey, form: FormState): boolean {
  switch (key) {
    case "title":
      return form.title.trim() !== "" || form.hostNote.trim() !== "";
    case "photos":
      return form.photos.length > 0;
    case "why":
      return form.whyText.trim() !== "" || form.dayText.trim() !== "";
    case "dates":
      return form.datesMode !== "month";
    case "accommodation":
      return form.accommodationMode === "crew";
    case "host":
      return form.hostExperience === "program";
    case "lookingFor":
      return form.lookingForText.trim() !== "";
    case "rules":
      return form.rulesText.trim() !== "";
    case "languages":
      return form.languages.length > 0;
    case "crewGroup":
      return form.crewGroupUrl.trim() !== "";
  }
}

/**
 * The House as it will be saved. A new House goes out with the place open (the host locks it on the Manage page, or the crew
 * votes); editing keeps the stay's lock (price, link, status). With only a month, or dates still to be voted on, the dates are the
 * month's bounds and `datesOpen` shows them as the month. An empty title takes `fallbackTitle` (the first suggestion).
 */
export function toInput(form: FormState, { me, editing, today = "", fallbackTitle = "", preferredCurrency }: { me?: User; editing?: Stay; today?: string; fallbackTitle?: string; preferredCurrency?: Currency | null } = {}): NewStayInput {
  const locked = editing?.accommodationStatus === "locked";
  const exact = form.datesMode === "exact";
  const bounds = monthBounds(form.month, today);
  const languages = form.languages.map(languageCode).filter((code): code is string => Boolean(code));
  return {
    title: form.title.trim() || fallbackTitle,
    city: form.city.trim(),
    region: form.region.trim(),
    startDate: exact ? form.startDate : bounds.start,
    endDate: exact ? form.endDate : bounds.end,
    datesOpen: !exact,
    datesVote:
      form.datesMode === "crew"
        ? voteOf(form.dateProposals.filter((p) => p.start && p.end).map((p) => ({ id: p.id, startDate: p.start, endDate: p.end })), form.datesDeadline, editing?.datesVote)
        : undefined,
    accommodationVote: locked
      ? editing?.accommodationVote
      : form.accommodationMode === "crew"
        ? voteOf(form.placeProposals.filter((p) => isLink(p.link.trim())).map((p) => ({ id: p.id, link: p.link.trim(), pricePerPerson: Math.round(Number(p.price)) })), form.accommodationDeadline, editing?.accommodationVote)
        : undefined,
    spotsTotal: form.spotsTotal,
    waitlistMax: form.waitlistMax,
    verifiedGuestsOnly: form.verifiedGuestsOnly || undefined,
    accommodationPhoto: form.accommodationPhoto || undefined,
    vibe: form.customVibe !== null || !form.vibe ? "social" : form.vibe,
    customVibe: form.customVibe?.trim() || undefined,
    language: languageOf(form, me),
    languages: languages.length > 1 ? languages.slice(1) : undefined,
    photos: form.photos.length > 0 ? form.photos : editing?.photos,
    currency: locked && editing ? editing.currency : currencyOf(form, me, preferredCurrency),
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
    houseRules: form.rulesText.split("\n").map((rule) => rule.trim()).filter(Boolean),
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
export type FieldKey = "photos" | "vibe" | "region" | "month" | "startDate" | "endDate" | "spotsTotal" | "budget" | "title" | "lookingForText" | "hostFee" | "crewGroupUrl" | "dateProposals" | "placeProposals";

/** A field's problem: the key of its `create.errors` message. */
export type FieldError =
  | { key: "cover" | "vibe" | "region" | "startDate" | "startPast" | "endDate" | "dateOrder" | "budget" | "budgetOrder" | "hostFee" | "crewGroupUrl" | "lookingForUnfinished" | "month" | "dateProposal" | "placeProposal" }
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

/** The host's exact dates. */
function datesErrors({ form, today, editing }: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
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
  return errors;
}

/** What blocks leaving a step, per field. Details never block – unless what's typed is wrong. */
export function stepErrors(step: StepKey, context: ValidationContext): FieldErrors {
  const { form, me, minSpots, today, editing, starters = [] } = context;
  const errors: FieldErrors = {};
  switch (step) {
    case "vibe":
      if (form.customVibe !== null ? !form.customVibe.trim() : !form.vibe) errors.vibe = { key: "vibe" };
      break;
    case "where":
      if (!form.region.trim()) errors.region = { key: "region" };
      if (form.datesMode === "exact") Object.assign(errors, datesErrors(context));
      else if (!form.month) errors.month = { key: "month" };
      break;
    case "crew": {
      if (form.spotsTotal < minSpots || form.spotsTotal > SPOTS_MAX) errors.spotsTotal = { key: "spots", min: minSpots, max: SPOTS_MAX };
      if (form.budgetTbd || editing?.accommodationStatus === "locked") break;
      const min = Number(form.budgetMin);
      const max = Number(form.budgetMax);
      if (!(min > 0) || !(max > 0)) errors.budget = { key: "budget" };
      else if (max < min) errors.budget = { key: "budgetOrder" };
      break;
    }
    case "dates":
      if (form.datesMode === "exact") Object.assign(errors, datesErrors(context));
      else if (form.datesMode === "crew") {
        const earliest = earliestStart(today);
        const valid = (p: DateProposal) => p.start && p.end && nightsBetween(p.start, p.end) >= 1 && (!earliest || p.start >= earliest);
        if (form.dateProposals.length === 0 || !form.dateProposals.every(valid)) errors.dateProposals = { key: "dateProposal" };
      }
      break;
    case "accommodation":
      if (form.accommodationMode === "crew" && (form.placeProposals.length === 0 || !form.placeProposals.every((p) => isLink(p.link.trim()) && Number(p.price) > 0))) errors.placeProposals = { key: "placeProposal" };
      break;
    case "cover": {
      if (editing) break;
      if (form.photos.length === 0) errors.photos = { key: "cover" };
      const length = form.title.trim().length;
      if (length < TITLE_MIN || length > TITLE_MAX_NEW) errors.title = { key: "titleLength", min: TITLE_MIN, max: TITLE_MAX_NEW };
      break;
    }
    case "title": {
      // Empty is fine: the House takes the first suggestion.
      const title = form.title.trim().length;
      const max = titleMaxFor(editing);
      if (title > 0 && (title < TITLE_MIN || title > max)) errors.title = { key: "titleLength", min: TITLE_MIN, max };
      break;
    }
    case "lookingFor":
      // Optional – but a starter alone isn't an answer yet.
      if (form.lookingForText.trim() && ownWords(form.lookingForText, starters).length < 3) errors.lookingForText = { key: "lookingForUnfinished" };
      break;
    case "host": {
      if (form.hostExperience !== "program" || !canChargeHostFee(me)) break;
      const fee = Math.round(Number(form.hostFee));
      const base = hostFeeBase(form, editing);
      if (!(fee > 0)) errors.hostFee = { key: "hostFee" };
      else if (base !== undefined && fee > maxHostFee(base)) errors.hostFee = { key: "hostFeeTooHigh", max: maxHostFee(base) };
      break;
    }
    case "crewGroup":
      if (form.crewGroupUrl.trim() && !isValidGroupUrl(form.crewGroupUrl)) errors.crewGroupUrl = { key: "crewGroupUrl" };
      break;
  }
  return errors;
}

/** Where a form with some answers starts: the first required step not done yet, or "Ready to open?". */
export function firstOpenStep(context: ValidationContext): StepKey {
  return REQUIRED_STEPS.find((key) => Object.keys(stepErrors(key, context)).length > 0) ?? "ready";
}

// ─── Draft ─────────────────────────────────────────────────────────────────────

/** The one draft (one per person; in this browser while it's a mock). */
export interface Draft {
  form: FormState;
  step: StepKey;
  /** When it last changed ("" for older drafts) */
  savedAt: string;
  /** Who started it; null: not logged in yet */
  ownerId: string | null;
}

/** Only the keys this form knows, with their defaults – older drafts and templates may carry others or miss some. */
function cleanForm(raw: object): FormState {
  const fits = (key: string, value: unknown) =>
    key === "customVibe" ? value === null || typeof value === "string" : typeof value === typeof initialForm[key as keyof FormState];
  const known = Object.entries(raw).filter(([key, value]) => key in initialForm && fits(key, value));
  return { ...initialForm, ...Object.fromEntries(known) };
}

/** Anything typed or picked yet – an untouched form isn't worth offering as a draft. */
export function hasContent(form: FormState): boolean {
  return (Object.keys(initialForm) as Array<keyof FormState>).some((key) => JSON.stringify(form[key]) !== JSON.stringify(initialForm[key]));
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as { form?: object; step?: unknown; savedAt?: unknown; ownerId?: unknown };
    const stored = cleanForm(draft.form ?? {});
    // A local preview link doesn't outlive the page.
    const form = { ...stored, photos: stored.photos.filter((photo) => !photo.startsWith("blob:")) };
    if (!hasContent(form)) return null;
    const step = STEPS.find((key) => key === draft.step) ?? "vibe";
    return { form, step, savedAt: typeof draft.savedAt === "string" ? draft.savedAt : "", ownerId: typeof draft.ownerId === "string" ? draft.ownerId : null };
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

const withoutDates = (form: FormState): FormState => ({ ...form, month: "", datesMode: "month", startDate: "", endDate: "", dateProposals: [], datesDeadline: "", photos: [], inviteIds: [], againFrom: "" });

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

/** /create with a place, dates and a category filled in – the flow picks them up (see prefillOf). */
export function createHref({ region, city, from, to, vibe }: { region?: string; city?: string; from?: string; to?: string; vibe?: Vibe | null }): string {
  const params = new URLSearchParams();
  if (region?.trim()) params.set("region", region.trim());
  if (city?.trim()) params.set("city", city.trim());
  if (from && ISO_DATE.test(from)) params.set("from", from);
  if (to && ISO_DATE.test(to)) params.set("to", to);
  if (vibe) params.set("vibe", vibe);
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

/** "2027-03" → its first and last day. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** Open a House with what a search asked for (see prefillOf). A world region says too little to fill in the place. */
export function createHrefOf({ place, month, category }: { place: SearchPlace | null; month: string | null; category?: Vibe | null }): string {
  const params = new URLSearchParams();
  if (place && placeKindOf(place.id) !== "world") params.set("place", place.id);
  if (month) params.set("month", month);
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/create?${query}` : "/create";
}

/** A place from the search, as the form's region and city ("Lisbon" + "Portugal"; a region or country has no city yet). */
export function formPlaceOf(place: SearchPlace): Pick<FormState, "region" | "city"> {
  const name = place.name.split(",")[0].trim();
  const kind = placeKindOf(place.id);
  if (kind === "city") return { region: place.country, city: name };
  return { region: kind === "country" ? place.country : `${name}, ${place.country}`, city: "" };
}

export const INVITE_PARAM = "invite";

/**
 * What a /create link fills in: ?place=<id>&month=YYYY-MM&category=<vibe> (from a search) or ?region=…&city=…&from=…&to=…&vibe=… (the same
 * trip again). A start before the earliest allowed one moves to it; an end that's no longer after the start is dropped. null when the
 * link carries nothing.
 */
export function prefillOf(search: string, today: string): Partial<FormState> | null {
  const params = new URLSearchParams(search);
  const place = placeById(params.get("place"));
  const named = place && placeKindOf(place.id) !== "world" ? formPlaceOf(place) : null;
  const region = named?.region ?? params.get("region")?.trim().slice(0, 80) ?? "";
  const city = named?.city ?? params.get("city")?.trim().slice(0, 80) ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const earliest = earliestStart(today);
  const start = ISO_DATE.test(from) ? (earliest && from < earliest ? earliest : from) : "";
  const end = ISO_DATE.test(to) && start && to > start ? to : "";
  const linkedMonth = params.get("month") ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(linkedMonth) && linkedMonth >= today.slice(0, 7) ? linkedMonth : start.slice(0, 7);
  const vibe = VIBES.find((v) => v.key === (params.get("category") ?? params.get("vibe")))?.key;
  if (!region && !city && !month && !vibe) return null;
  return {
    ...(region && { region }),
    ...(city && { city }),
    ...(month && { month }),
    ...(start && end && { datesMode: "exact" as const, startDate: start, endDate: end }),
    ...(vibe && { vibe }),
  };
}
