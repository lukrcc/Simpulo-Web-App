// The FAQ (/faq) – every text here, every number and deadline from config/policies.ts. Each question has its own anchor (#payment …);
// /faq#cancellation is where the House page's "Cancellation rules" lead.
import { CANCELLATION_POLICY, FEE_MODEL, PAYMENT_POLICY } from "./policies";

export type FaqRole = "join" | "host";

export interface FaqItem {
  /** The anchor: /faq#payment */
  id: string;
  question: string;
  answer: string;
  /** One link under the answer */
  link?: { href: string; label: string };
}

const { paymentWindowHours, hostBookingWindowHours } = PAYMENT_POLICY;
const { serviceFeePercent } = FEE_MODEL;

/** The cancellation rules in short – the same rules as CANCELLATION_POLICY, in full on /cancellation. */
const cancellationShort = [
  "Until the crew is complete, you can withdraw your request or leave your spot any time, for free.",
  "After paying, you can hand your spot to the next person on the waitlist and get everything back except the service fee; if nobody takes it, there's no refund.",
  `If the host cancels or doesn't confirm the booking within ${CANCELLATION_POLICY.bookingWindowHours}h after everyone paid, you get everything back.`,
].join(" ");

export const FAQ: Record<FaqRole, readonly FaqItem[]> = {
  join: [
    { id: "payment", question: "Where does my money go?", answer: "You pay Simpulo, not the host. We hold your payment until the crew is complete and the host has booked the place." },
    { id: "when-to-pay", question: "When do I pay?", answer: `Only after the host accepts you. You then have ${paymentWindowHours}h to pay your share.` },
    { id: "refund", question: "What if the House doesn't fill up or the host doesn't book?", answer: "You get your money back in full." },
    { id: "cancellation", question: "Can I cancel?", answer: cancellationShort, link: { href: "/cancellation", label: "All cancellation rules →" } },
    { id: "fees", question: "What does Simpulo charge?", answer: `A ${serviceFeePercent} % service fee on your share, shown before you pay. Nothing else.` },
    { id: "people", question: "Who will I live with?", answer: "You see everyone's profile before you join – who they've lived with, languages, socials. Verified members have a badge." },
    { id: "place", question: "Is the place already booked?", answer: "Some Houses come with a set place and price. Others are planned together – you'll see a price range until the crew picks the place." },
  ],
  host: [
    { id: "host-fees", question: "What does hosting cost?", answer: "Nothing. You pay your share like everyone else." },
    { id: "host-money", question: "How does the money work?", answer: `Your crew pays through Simpulo. Once everyone has paid, the money is released to you and you book the place within ${hostBookingWindowHours}h.` },
    { id: "not-full", question: "What if my House doesn't fill up?", answer: "Nobody pays until the crew is complete. If it doesn't fill by your deadline, the House closes and nobody is charged." },
    { id: "who-joins", question: "Who decides who joins?", answer: "You. Nobody is in without your yes." },
    { id: "place-host", question: "Do I need a place already?", answer: "No. Bring a place you've found – or just a city, dates and a budget and pick the place together with your crew." },
    { id: "verify", question: "Do I need to verify?", answer: "Only when you receive money: setting up payouts includes an ID check by our payment partner. Hosts with payouts get the Verified badge automatically." },
  ],
};

/** Which side a question's anchor belongs to (/faq#host-fees opens Hosting). */
export function roleOfAnchor(id: string): FaqRole | null {
  if (FAQ.join.some((item) => item.id === id)) return "join";
  if (FAQ.host.some((item) => item.id === id)) return "host";
  return null;
}
