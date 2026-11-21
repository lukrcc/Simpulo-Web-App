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
  /** A phone number – or another quick way to reach us (the imprint needs a second direct contact) */
  phone: string | null;
  /** Commercial register and number, if registered */
  register: string | null;
  /** VAT ID – optional */
  vatId: string | null;
  /** Responsible for the content (name and address) */
  contentResponsible: string | null;
  /** Address for privacy requests */
  privacyEmail: string | null;
  /** The single point of contact for authorities and users (one email) – on /impressum and /help */
  contactPoint: string | null;
  /** The languages the contact point answers in */
  contactLanguages: string | null;
}

export const COMPANY: Company = {
  name: null,
  street: null,
  city: null,
  country: null,
  representative: null,
  email: null,
  phone: null,
  register: null,
  vatId: null,
  contentResponsible: null,
  privacyEmail: null,
  contactPoint: null,
  contactLanguages: null,
};

/** Optional fields: no gap in the launch checklist when they stay empty (the imprint then leaves the line out). */
export const COMPANY_OPTIONAL: readonly (keyof Company)[] = ["register", "vatId"];

/** The fields still to fill (for the launch checklist). */
export function companyGaps(): (keyof Company)[] {
  return (Object.keys(COMPANY) as (keyof Company)[]).filter((k) => COMPANY[k] === null && !COMPANY_OPTIONAL.includes(k));
}
