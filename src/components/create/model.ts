import { canChargeHostFee, maxHostFee } from "@/lib/fees";
import { isProfileComplete, type ProfilePatch } from "@/lib/store";
import type { Currency, NewStayInput, Stay, User, Vibe } from "@/lib/types";
import { LANGUAGES, addDays, currencyForCountry, findUrls, languageCode, nightsBetween } from "@/lib/utils";

/*
 * Open a House – the form state and everything derived from it (no React here): defaults, validation per step,
 * what gets saved to the House and to the profile.
 */

export const DRAFT_KEY = "draftHouse";
export const HOST_NOTE_MAX = 60;
export const MAX_IDEAS = 3;
export const TITLE_MIN = 4;
export const TITLE_MAX = 60;
export const CUSTOM_VIBE_MAX = 20;
export const LOOKING_FOR_MIN = 20;
export const LOOKING_FOR_MAX = 160;
export const MAX_NIGHTS = 120;
export const DEFAULT_LANGUAGE = "en";

export const STEPS = ["house", "pitch", "about", "publish"] as const;
export const PUBLISH_STEP = STEPS.length - 1;

export interface FormState {
  // 1 · The House
  title: string;
  city: string;
  region: string;
  /** "City still open – we'll decide together": publishes without a city */
  cityOpen: boolean;
  startDate: string;
  endDate: string;
  spotsTotal: number;
  /** "" = not picked yet (saved as "mixed") */
  vibe: Vibe | "";
  /** The host's own vibe label – non-null means "+ Custom" is the pick (saved as vibe "mixed") */
  customVibe: string | null;
  /** ISO 639-1; "" = English */
  language: string;
  /** "" = default from the host's country */
  currency: Currency | "";
  /** Both "" = no budget ("Skip – decide together") */
  budgetMin: string;
  budgetMax: string;
  /** Host programme per person, verified hosts only ("" = none) */
  hostFee: string;
  // 2 · Your pitch
  whyText: string;
  /** Always the full text – with the template on, it's the parts joined (see joinDayParts) */
  dayText: string;
  /** Morning · Afternoon · Evening template; null = written freely */
  dayParts: [string, string, string] | null;
  lookingForText: string;
  hostNote: string;
  /** Up to 3 links; posted into the crew chat on publish (create only) */
  accommodationIdeas: string[];
  // 3 · About you – undefined = untouched, shown pre-filled from the logged-in user
  aboutPhotos?: string[];
  aboutName?: string;
  aboutAge?: string;
  aboutCountry?: string;
}

export const initialForm: FormState = {
  title: "",
  city: "",
  region: "",
  cityOpen: false,
  startDate: "",
  endDate: "",
  spotsTotal: 4,
  vibe: "",
  customVibe: null,
  language: "",
  currency: "",
  budgetMin: "",
  budgetMax: "",
  hostFee: "",
  whyText: "",
  dayText: "",
  dayParts: null,
  lookingForText: "",
  hostNote: "",
  accommodationIdeas: [""],
};

/** The edit page starts from the House as it is. */
export function formFromStay(stay: Stay): FormState {
  return {
    ...initialForm,
    title: stay.title,
    city: stay.city,
    region: stay.region,
    cityOpen: !stay.city.trim(),
    startDate: stay.startDate,
    endDate: stay.endDate,
    spotsTotal: stay.spotsTotal,
    vibe: stay.vibe,
    customVibe: stay.customVibe ?? null,
    language: stay.language,
    currency: stay.currency,
    budgetMin: stay.budgetPerPerson ? String(stay.budgetPerPerson.min) : "",
    budgetMax: stay.budgetPerPerson ? String(stay.budgetPerPerson.max) : "",
    hostFee: stay.hostFeePerPerson ? String(stay.hostFeePerPerson) : "",
    whyText: stay.whyText,
    dayText: stay.dayText,
    lookingForText: stay.lookingForText,
    hostNote: stay.hostNote ?? "",
  };
}

/**
 * "About you" as it currently reads: what the host typed, else their profile, else empty. Only what a House
 * needs – links, bio and crew-only contacts live in Edit profile.
 */
export interface About {
  photos: string[];
  name: string;
  age: string;
  country: string;
}

export function aboutOf(form: FormState, me?: User): About {
  return {
    photos: form.aboutPhotos ?? me?.photos ?? [],
    name: form.aboutName ?? me?.name ?? "",
    age: form.aboutAge ?? (me && me.age > 0 ? String(me.age) : ""),
    country: form.aboutCountry ?? me?.country ?? "",
  };
}

/** The vibe whose suggestions (titles, starters) apply: a custom vibe uses the "mixed" ones. */
export function suggestionVibe(form: FormState): Vibe {
  return form.customVibe !== null || !form.vibe ? "mixed" : form.vibe;
}

/** "Morning: …\nAfternoon: …\nEvening: …" – only the parts that are filled. */
export function joinDayParts(parts: [string, string, string], labels: [string, string, string]): string {
  return parts
    .map((part, i) => (part.trim() ? `${labels[i]}: ${part.trim()}` : ""))
    .filter(Boolean)
    .join("\n");
}

/**
 * How step 3 looks: a summary of a complete profile, only the missing required fields of an incomplete one,
 * or the whole form when logged out (saved to the profile after login on publish).
 */
export type AboutMode = { kind: "summary" } | { kind: "missing"; fields: AboutField[] } | { kind: "full" };
export type AboutField = "photo" | "name" | "age" | "country";

export function aboutModeOf(me?: User): AboutMode {
  if (!me) return { kind: "full" };
  if (isProfileComplete(me)) return { kind: "summary" };
  const fields: AboutField[] = [];
  if (!me.photos[0]) fields.push("photo");
  if (!me.name.trim()) fields.push("name");
  if (!(me.age >= 18)) fields.push("age");
  if (!me.country.trim()) fields.push("country");
  return { kind: "missing", fields };
}

/** The House language options: the host's own languages first (as ISO codes), then the common ones. */
export function languageOptions(me?: User): { own: string[]; common: string[] } {
  const own = Array.from(new Set((me?.languages ?? []).map(languageCode).filter((code): code is string => code !== undefined)));
  const first = own.length > 0 ? own : [DEFAULT_LANGUAGE];
  return { own: first, common: LANGUAGES.map((l) => l.code).filter((code) => !first.includes(code)) };
}

export function languageOf(form: FormState): string {
  return form.language || DEFAULT_LANGUAGE;
}

/** The House currency as it will be saved: the host's pick, else the currency of their country. */
export function currencyOf(form: FormState, me?: User): Currency {
  return form.currency || currencyForCountry(form.aboutCountry ?? me?.country ?? "");
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

/** Optional budget: either end alone counts for both, a reversed range is turned around. */
function budgetOf(form: FormState): { min: number; max: number } | undefined {
  const values = [Number(form.budgetMin), Number(form.budgetMax)].filter((n) => n > 0).map(Math.round);
  if (values.length === 0) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * The share the 30 % host programme cap is measured against: the locked price, else the low end of the budget
 * (undefined = no budget yet – the cap applies when the place is locked).
 */
export function hostFeeBase(form: FormState, editing?: Stay): number | undefined {
  if (editing?.accommodationStatus === "locked" && editing.pricePerPerson) return editing.pricePerPerson;
  return budgetOf(form)?.min;
}

/** The host fee as saved: a whole amount > 0, and only for hosts who may charge one. */
function hostFeeOf(form: FormState, me?: User): number | undefined {
  const fee = Math.round(Number(form.hostFee));
  return canChargeHostFee(me) && fee > 0 ? fee : undefined;
}

export const PITCH_FIELDS = ["whyText", "dayText", "lookingForText"] as const;

export function pitchCount(form: FormState): number {
  return PITCH_FIELDS.filter((key) => form[key].trim() !== "").length;
}

/**
 * The House as it will be saved. New Houses always go out with the place open (locking happens on the Manage
 * page); editing keeps the stay's lock (price, link, status) and the fields this form no longer shows untouched.
 */
export function toInput(form: FormState, me?: User, editing?: Stay): NewStayInput {
  const locked = editing?.accommodationStatus === "locked";
  return {
    title: form.title.trim(),
    city: form.cityOpen ? "" : form.city.trim(),
    region: form.region.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    spotsTotal: form.spotsTotal,
    vibe: form.customVibe !== null || !form.vibe ? "mixed" : form.vibe,
    customVibe: form.customVibe?.trim() || undefined,
    language: languageOf(form),
    currency: locked && editing ? editing.currency : currencyOf(form, me),
    pricePerPerson: editing?.pricePerPerson,
    budgetPerPerson: locked ? editing?.budgetPerPerson : budgetOf(form),
    accommodationLink: editing?.accommodationLink,
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

/** What "About you" writes to the profile on publish – only its four fields; everything else stays as it is. */
export function toProfilePatch(form: FormState, me?: User): ProfilePatch {
  const about = aboutOf(form, me);
  return {
    photos: about.photos,
    ...(about.name.trim() && { name: about.name.trim() }),
    ...(Number(about.age) >= 18 && { age: Number(about.age) }),
    ...(about.country.trim() && { country: about.country.trim() }),
  };
}

/** Fields that can be invalid – also their DOM ids (`create-<key>`) for jumping to them. */
export type FieldKey = "title" | "region" | "startDate" | "endDate" | "spotsTotal" | "hostFee" | "lookingForText" | "photo" | "name" | "age" | "country";

/** A field's problem: the key of its `create.errors` message. */
export type FieldError =
  | { key: "region" | "startDate" | "startPast" | "endDate" | "dateOrder" | "lookingFor" | "lookingForUnfinished" | "photo" | "name" | "age" | "country" }
  | { key: "tooLong"; max: number }
  | { key: "titleLength"; min: number; max: number }
  | { key: "minSpots"; count: number }
  | { key: "hostFeeTooHigh"; max: number };

export type FieldErrors = Partial<Record<FieldKey, FieldError>>;

/** DOM id of a field (or a jump target such as the profile summary). */
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

/** What blocks leaving a step, per field (in the order the fields appear). Optional fields never block. */
export function stepErrors(step: number, { form, me, minSpots, today, editing, starters = [] }: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0) {
    const title = form.title.trim().length;
    if (title < TITLE_MIN || title > TITLE_MAX) errors.title = { key: "titleLength", min: TITLE_MIN, max: TITLE_MAX };
    if (!form.region.trim()) errors.region = { key: "region" };
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
    if (form.spotsTotal < minSpots) errors.spotsTotal = { key: "minSpots", count: minSpots };
    const fee = hostFeeOf(form, me);
    const base = hostFeeBase(form, editing);
    if (fee !== undefined && base !== undefined && fee > maxHostFee(base)) errors.hostFee = { key: "hostFeeTooHigh", max: maxHostFee(base) };
  }
  if (step === 1) {
    // The hook on cards and the Spotlight – one honest line at least.
    const text = form.lookingForText.trim();
    if (text.length < LOOKING_FOR_MIN) errors.lookingForText = { key: "lookingFor" };
    else if (ownWords(text, starters).length < 3) errors.lookingForText = { key: "lookingForUnfinished" };
  }
  if (step === 2) {
    const mode = aboutModeOf(me);
    if (mode.kind === "summary") return errors;
    const about = aboutOf(form, me);
    const age = Number(about.age);
    if (!about.photos[0]) errors.photo = { key: "photo" };
    if (!about.name.trim()) errors.name = { key: "name" };
    if (!Number.isInteger(age) || age < 18 || age > 99) errors.age = { key: "age" };
    if (!about.country.trim()) errors.country = { key: "country" };
  }
  return errors;
}

/** The fields each step owns – touched-state and error display are tracked per field. */
export const STEP_OF_FIELD: Record<FieldKey, number> = {
  title: 0,
  region: 0,
  startDate: 0,
  endDate: 0,
  spotsTotal: 0,
  hostFee: 0,
  lookingForText: 1,
  photo: 2,
  name: 2,
  age: 2,
  country: 2,
};

export interface Draft {
  form: FormState;
  step: number;
}

const ABOUT_KEYS = ["aboutPhotos", "aboutName", "aboutAge", "aboutCountry"];

function pick(source: object, keys: string[]): Partial<FormState> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => keys.includes(key)));
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<Draft>;
    // Fields of older drafts that no longer exist are dropped; new ones get their defaults.
    const form: FormState = { ...initialForm, ...pick(draft.form ?? {}, Object.keys(initialForm).concat(ABOUT_KEYS)) };
    // Older drafts kept three fixed idea slots; drop the empty trailing ones.
    const ideas = form.accommodationIdeas.filter((link, i) => i === 0 || link.trim() !== "").slice(0, MAX_IDEAS);
    return { form: { ...form, accommodationIdeas: ideas.length > 0 ? ideas : [""] }, step: Math.min(Math.max(draft.step ?? 0, 0), PUBLISH_STEP) };
  } catch {
    return null;
  }
}

export function writeDraft(draft: Draft) {
  try {
    // Photos are left out (undefined is dropped by JSON): their blob: URLs stop working after a reload.
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: { ...draft.form, aboutPhotos: undefined }, step: draft.step } satisfies Draft));
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

// ─── Prefill links ("Open one", "Open your own House", "Host your own next trip") ──────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** /create with a place and dates filled in – the stepper picks them up (see prefillOf). */
export function createHref({ region, city, from, to }: { region?: string; city?: string; from?: string; to?: string }): string {
  const params = new URLSearchParams();
  if (region?.trim()) params.set("region", region.trim());
  if (city?.trim()) params.set("city", city.trim());
  if (from && ISO_DATE.test(from)) params.set("from", from);
  if (to && ISO_DATE.test(to)) params.set("to", to);
  const query = params.toString();
  return query ? `/create?${query}` : "/create";
}

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
  return { ...(region && { region }), ...(city && { city, cityOpen: false }), ...(start && { startDate: start, endDate: end }) };
}
