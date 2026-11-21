/*
 * The company behind Simpulo – the one source for the imprint and the legal texts (content/legal/*.md quote it as {{company.<field>}}).
 *
 * TO FILL (Lukas): every field that is null is a placeholder. A null value shows on the pages as a clearly marked gap
 * "[to fill: …]", and the launch checklist in Admin lists every gap. Nothing here is invented.
 */
export interface Company {
  /** Name and legal form, e.g. "Simpulo …" – as registered */
  name: string | null;
  /** Street and number */
  street: string | null;
  /** Postcode and city */
  city: string | null;
  country: string | null;
  /** Who represents the company (managing director / owner) */
  representative: string | null;
  /** The general contact address */
  email: string | null;
  /** The second quick way to reach us besides email (the imprint needs one) – here the contact form, no phone */
  secondContact: string | null;
  /** Commercial register and number, if registered */
  register: string | null;
  /** VAT ID – optional */
  vatId: string | null;
  /** Responsible for the content (name and address) */
  contentResponsible: string | null;
  /** Address for privacy requests – null: the general email (lib/legal/values.ts), not kept twice */
  privacyEmail: string | null;
  /** The single point of contact for authorities and users (one email) – on /impressum and /help */
  contactPoint: string | null;
  /** The languages the contact point answers in */
  contactLanguages: string | null;
}

export const COMPANY: Company = {
  name: "Lukas Richter",
  /** The address follows: a real business address replaces this before launch (Admin › System › Launch keeps it open; a live build stops). */
  street: null,
  city: null,
  country: null,
  representative: null,
  email: "lukas@simpulo.app",
  secondContact: "the contact form at [simpulo.app/contact](/contact)",
  register: null,
  vatId: null,
  contentResponsible: null,
  privacyEmail: null,
  contactPoint: null,
  contactLanguages: null,
};

/** Optional fields: no gap in the launch checklist when they stay empty (the imprint then leaves the line out). privacyEmail falls back to
 *  the email. */
export const COMPANY_OPTIONAL: readonly (keyof Company)[] = ["register", "vatId", "privacyEmail"];

/** The business address – street, postcode and city, country. Until all three are set: no public launch (Regel, CLAUDE.md "Rechtsseiten"). */
export const ADDRESS_FIELDS = ["street", "city", "country"] as const satisfies readonly (keyof Company)[];
export const hasBusinessAddress = () => ADDRESS_FIELDS.every((k) => COMPANY[k] !== null && COMPANY[k]!.trim() !== "");

/** The fields still to fill (for the launch checklist). */
export function companyGaps(): (keyof Company)[] {
  return (Object.keys(COMPANY) as (keyof Company)[]).filter((k) => COMPANY[k] === null && !COMPANY_OPTIONAL.includes(k));
}
