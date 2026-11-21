// The help center (/help – CLAUDE.md "Hilfe-Center"): its categories and their questions, each with the numbers its answer needs – every
// number from config/policies.ts. Structure only: the words are in lib/i18n/en.ts faq.items.<id>.question / .answer / .link (one store of
// questions and answers for the help center, the start page and /host). Every question has its own anchor (/help#cancellation).
import { CANCELLATION_POLICY, FEE_MODEL, HELP_WINDOW, MANUAL_REMINDERS, PAYMENT_POLICY, REQUEST_POLICY, WAITLIST_POLICY } from "./policies";

const WAITLIST_OFFER_HOURS = WAITLIST_POLICY.offerHours;

export const HELP_CATEGORIES = ["joining", "hosting", "payments", "safety", "account"] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export interface HelpItem {
  /** The anchor (/help#payment) and the text key (faq.items.<id>) */
  id: string;
  /** The answer's numbers ({hours}, {percent} …) */
  values?: Record<string, number>;
  /** One link under the answer (its words: faq.items.<id>.link) */
  link?: { href: string };
}

export const HELP: Record<HelpCategory, readonly HelpItem[]> = {
  joining: [
    { id: "how-to-join", values: { hours: REQUEST_POLICY.requestExpiryHours } },
    { id: "people" },
    { id: "place" },
    { id: "request-runs-out", values: { hours: REQUEST_POLICY.requestExpiryHours, remind: MANUAL_REMINDERS.guestToHost.afterHours } },
    { id: "with-friend" },
    { id: "full-house", values: { hours: WAITLIST_OFFER_HOURS } },
  ],
  hosting: [
    { id: "host-fees", values: { percent: FEE_MODEL.hostFeeCommissionPercent } },
    { id: "host-money", values: { hours: PAYMENT_POLICY.hostBookingWindowHours } },
    { id: "not-full" },
    { id: "who-joins", values: { hours: REQUEST_POLICY.requestExpiryHours } },
    { id: "place-host" },
    { id: "host-at-home" },
    { id: "verify" },
  ],
  payments: [
    { id: "payment" },
    { id: "when-to-pay", values: { hours: PAYMENT_POLICY.paymentWindowHours } },
    { id: "fees", values: { percent: FEE_MODEL.serviceFeePercent } },
    { id: "currency" },
    { id: "refund" },
    { id: "cancellation", values: { hours: CANCELLATION_POLICY.bookingWindowHours }, link: { href: "/cancellation" } },
  ],
  safety: [
    { id: "report" },
    { id: "emergency" },
    { id: "help-on-site", values: { before: HELP_WINDOW.daysBefore, after: HELP_WINDOW.daysAfter } },
    { id: "block" },
    { id: "harassment" },
    { id: "verified-people" },
  ],
  account: [
    { id: "who-sees-me" },
    { id: "last-name" },
    { id: "emails" },
    { id: "your-data" },
    { id: "pause" },
    { id: "delete" },
  ],
};

/** The category a question's anchor belongs to (/help#host-fees opens Hosting); null when there's no such question. */
export function categoryOf(id: string): HelpCategory | null {
  return HELP_CATEGORIES.find((c) => HELP[c].some((item) => item.id === id)) ?? null;
}

/** Old FAQ links (/faq?role=host → /help?cat=hosting): the category of an old role. */
export const CATEGORY_OF_ROLE: Record<string, HelpCategory> = { host: "hosting", join: "joining" };
