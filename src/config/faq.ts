// The questions in two sides (Joining · Hosting) – now read from the help center (config/help.ts, /help).
// The FAQ (formerly /faq): which questions, in which order, with which numbers – every number and deadline from config/policies.ts. The words are
// in lib/i18n/en.ts (faq.items.<id>.question / .answer / .link, the numbers as ICU placeholders). Each question has its own anchor (#payment …);
// /faq#cancellation is where the House page's "Cancellation rules" lead.
import { HELP } from "./help";

export type FaqRole = "join" | "host";

export interface FaqItem {
  /** The anchor (/faq#payment) and the text key (faq.items.<id>) */
  id: string;
  /** The answer's numbers ({hours}, {percent}) */
  values?: Record<string, number>;
  /** One link under the answer (its words: faq.items.<id>.link) */
  link?: { href: string };
}


/** Joining and hosting – the help center's questions (config/help.ts) in the two old sides; the start page and /host pick from them. */
export const FAQ: Record<FaqRole, readonly FaqItem[]> = {
  join: [...HELP.joining, ...HELP.payments, ...HELP.safety, ...HELP.account],
  host: HELP.hosting,
};

/** Which side a question's anchor belongs to (/faq#host-fees opens Hosting). */
export function roleOfAnchor(id: string): FaqRole | null {
  if (FAQ.join.some((item) => item.id === id)) return "join";
  if (FAQ.host.some((item) => item.id === id)) return "host";
  return null;
}
