// The FAQ (/faq): which questions, in which order, with which numbers – every number and deadline from config/policies.ts. The words are
// in lib/i18n/en.ts (faq.items.<id>.question / .answer / .link, the numbers as ICU placeholders). Each question has its own anchor (#payment …);
// /faq#cancellation is where the House page's "Cancellation rules" lead.
import { CANCELLATION_POLICY, FEE_MODEL, PAYMENT_POLICY } from "./policies";

export type FaqRole = "join" | "host";

export interface FaqItem {
  /** The anchor (/faq#payment) and the text key (faq.items.<id>) */
  id: string;
  /** The answer's numbers ({hours}, {percent}) */
  values?: Record<string, number>;
  /** One link under the answer (its words: faq.items.<id>.link) */
  link?: { href: string };
}

const { paymentWindowHours, hostBookingWindowHours } = PAYMENT_POLICY;
const { serviceFeePercent } = FEE_MODEL;

export const FAQ: Record<FaqRole, readonly FaqItem[]> = {
  join: [
    { id: "payment" },
    { id: "when-to-pay", values: { hours: paymentWindowHours } },
    { id: "refund" },
    // The cancellation rules in short – the same rules as CANCELLATION_POLICY, in full on /cancellation.
    { id: "cancellation", values: { hours: CANCELLATION_POLICY.bookingWindowHours }, link: { href: "/cancellation" } },
    { id: "fees", values: { percent: serviceFeePercent } },
    { id: "people" },
    { id: "place" },
  ],
  host: [
    { id: "host-fees" },
    { id: "host-money", values: { hours: hostBookingWindowHours } },
    { id: "not-full" },
    { id: "who-joins" },
    { id: "place-host" },
    { id: "host-at-home" },
    { id: "verify" },
  ],
};

/** Which side a question's anchor belongs to (/faq#host-fees opens Hosting). */
export function roleOfAnchor(id: string): FaqRole | null {
  if (FAQ.join.some((item) => item.id === id)) return "join";
  if (FAQ.host.some((item) => item.id === id)) return "host";
  return null;
}
