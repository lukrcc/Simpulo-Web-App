/*
 * Contact details stay in the app until a crew is complete: what's about to be sent is checked here. Frontend and mock only
 * for now; with a real backend this has to run on the server too. Catches what's written plainly, not "null one five one".
 */

const MASK = "•••";
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CHAT_LINK = /(?:https?:\/\/)?(?:www\.)?(?:wa\.me|t\.me|telegram\.me|telegram\.dog|(?:web\.)?telegram\.org|(?:chat\.|api\.|web\.)?whatsapp\.com)(?:\/[^\s]*)?/gi;
const NUMBER_RUN = /(?<![\w/.])\+?\(?\d[\d ().\-/]{6,}\d(?![\w])/g;
const DATE = /^(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})$/;

/** A phone number, not a date, a price or a year range: a + or leading 0, or too many digits for anything else. */
function looksLikePhone(run: string): boolean {
  const digits = run.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || DATE.test(run)) return false;
  return run.startsWith("+") || run.startsWith("(") || digits.startsWith("0") || digits.length >= 9;
}

/** The text with phone numbers, email addresses and WhatsApp / Telegram links replaced, and whether anything was. */
export function maskContacts(text: string): { text: string; masked: boolean } {
  const out = text
    .replace(EMAIL, MASK)
    .replace(CHAT_LINK, MASK)
    .replace(NUMBER_RUN, (run) => (looksLikePhone(run) ? MASK : run));
  return { text: out, masked: out !== text };
}

/** Details are free only in a House's own chat, once its crew is complete; a direct chat stays filtered. */
export function contactsAllowed(thread: { type: "house" | "direct" }, stay?: { spotsFilled: number; spotsTotal: number }): boolean {
  return thread.type === "house" && stay !== undefined && stay.spotsFilled >= stay.spotsTotal;
}
