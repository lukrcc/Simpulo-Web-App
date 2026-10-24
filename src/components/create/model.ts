import { CONTACT_FIELDS, SOCIAL_FIELDS, type SocialKey } from "@/components/profile/profileFields";
import { isProfileComplete, type ProfilePatch } from "@/lib/store";
import type { Currency, NewStayInput, PrivateContacts, Stay, User, Vibe } from "@/lib/types";
import { currencyForCountry, findUrls, languageCode, nightsBetween } from "@/lib/utils";

/*
 * Open a House – the form state and everything derived from it (no React here): defaults, validation per step,
 * what gets saved to the House and to the profile.
 */

export const DRAFT_KEY = "draftHouse";
export const HOST_NOTE_MAX = 60;
export const BIO_MAX = 160;
export const MAX_IDEAS = 3;
export const TITLE_MIN = 4;
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
  vibe: Vibe;
  /** ISO 639-1; "" = English */
  language: string;
  /** "" = default from the host's country */
  currency: Currency | "";
  budgetMin: string;
  budgetMax: string;
  // 2 · Your pitch
  whyText: string;
  dayText: string;
  lookingForText: string;
  hostNote: string;
  /** Up to 3 links; posted into the crew chat on publish (create only) */
  accommodationIdeas: string[];
  // 3 · About you – undefined = untouched, shown pre-filled from the logged-in user
  aboutPhotos?: string[];
  aboutName?: string;
  aboutAge?: string;
  aboutCountry?: string;
  aboutLanguages?: string[];
  aboutBio?: string;
  aboutSocials?: Partial<Record<SocialKey, string>>;
  aboutContacts?: PrivateContacts;
}

export const initialForm: FormState = {
  title: "",
  city: "",
  region: "",
  cityOpen: false,
  startDate: "",
  endDate: "",
  spotsTotal: 4,
  vibe: "remote-work",
  language: "",
  currency: "",
  budgetMin: "",
  budgetMax: "",
  whyText: "",
  dayText: "",
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
    language: stay.language,
    currency: stay.currency,
    budgetMin: stay.budgetPerPerson ? String(stay.budgetPerPerson.min) : "",
    budgetMax: stay.budgetPerPerson ? String(stay.budgetPerPerson.max) : "",
    whyText: stay.whyText,
    dayText: stay.dayText,
    lookingForText: stay.lookingForText,
    hostNote: stay.hostNote ?? "",
  };
}

/** "About you" as it currently reads: what the host typed, else their profile, else empty. */
export interface About {
  photos: string[];
  name: string;
  age: string;
  country: string;
  languages: string[];
  bio: string;
  socials: Partial<Record<SocialKey, string>>;
  contacts: PrivateContacts;
}

export function aboutOf(form: FormState, me?: User): About {
  return {
    photos: form.aboutPhotos ?? me?.photos ?? [],
    name: form.aboutName ?? me?.name ?? "",
    age: form.aboutAge ?? (me && me.age > 0 ? String(me.age) : ""),
    country: form.aboutCountry ?? me?.country ?? "",
    languages: form.aboutLanguages ?? me?.languages ?? [],
    bio: form.aboutBio ?? me?.bio ?? "",
    socials: { ...(me && Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, me[key] ?? ""]))), ...form.aboutSocials },
    contacts: { ...me?.privateContacts, ...form.aboutContacts },
  };
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

/** The House language options: English plus the host's own languages as ISO codes (unknown names dropped) and the current pick. */
export function languageOptions(form: FormState, me?: User): string[] {
  const codes = aboutOf(form, me).languages.map(languageCode).filter((code): code is string => code !== undefined);
  return Array.from(new Set([DEFAULT_LANGUAGE, ...codes, ...(form.language ? [form.language] : [])]));
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

/** Optional budget: either end alone counts for both, a reversed range is turned around. */
function budgetOf(form: FormState): { min: number; max: number } | undefined {
  const values = [Number(form.budgetMin), Number(form.budgetMax)].filter((n) => n > 0).map(Math.round);
  if (values.length === 0) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
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
    vibe: form.vibe,
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
    interests: editing?.interests ?? [],
    houseRules: editing?.houseRules ?? [],
  };
}

/** What "About you" writes to the profile on publish. */
export function toProfilePatch(form: FormState, me?: User): ProfilePatch {
  const about = aboutOf(form, me);
  const patch: ProfilePatch = {
    photos: about.photos,
    ...(about.name.trim() && { name: about.name.trim() }),
    ...(Number(about.age) >= 18 && { age: Number(about.age) }),
    ...(about.country.trim() && { country: about.country.trim() }),
    languages: about.languages,
    bio: about.bio.trim().slice(0, BIO_MAX),
  };
  for (const { key } of SOCIAL_FIELDS) {
    const value = about.socials[key]?.trim();
    if (value) patch[key] = value;
  }
  // Crew-only channels: what's filled in replaces the stored set (an emptied field removes that channel).
  const contacts: PrivateContacts = {};
  for (const key of CONTACT_FIELDS) {
    const value = about.contacts[key]?.trim();
    if (value) contacts[key] = value;
  }
  patch.privateContacts = contacts;
  return patch;
}

/** Fields that can be invalid – also their DOM ids (`create-<key>`) for jumping to them. */
export type FieldKey = "title" | "region" | "startDate" | "endDate" | "spotsTotal" | "photo" | "name" | "age" | "country";

/** A field's problem: the key of its `create.errors` message. */
export type FieldError =
  | { key: "title" | "region" | "startDate" | "startPast" | "endDate" | "dateOrder" | "photo" | "name" | "age" | "country" }
  | { key: "tooLong"; max: number }
  | { key: "minSpots"; count: number };

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
}

/** Today as YYYY-MM-DD in the host's time zone. */
export function todayString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** What blocks leaving a step, per field (in the order the fields appear). Optional fields never block. */
export function stepErrors(step: number, { form, me, minSpots, today, editing }: ValidationContext): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0) {
    if (form.title.trim().length < TITLE_MIN) errors.title = { key: "title" };
    if (!form.region.trim()) errors.region = { key: "region" };
    // A House that already started can still be edited without moving its start.
    const startChanged = !editing || form.startDate !== editing.startDate;
    if (!form.startDate) errors.startDate = { key: "startDate" };
    else if (startChanged && form.startDate < today) errors.startDate = { key: "startPast" };
    if (!form.endDate) errors.endDate = { key: "endDate" };
    else if (form.startDate) {
      const nights = nightsBetween(form.startDate, form.endDate);
      if (nights < 1) errors.endDate = { key: "dateOrder" };
      else if (nights > MAX_NIGHTS) errors.endDate = { key: "tooLong", max: MAX_NIGHTS };
    }
    if (form.spotsTotal < minSpots) errors.spotsTotal = { key: "minSpots", count: minSpots };
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
  photo: 2,
  name: 2,
  age: 2,
  country: 2,
};

export interface Draft {
  form: FormState;
  step: number;
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<Draft>;
    const form: FormState = { ...initialForm, ...draft.form };
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
