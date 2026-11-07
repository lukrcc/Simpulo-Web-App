// How it works › Questions: the answers by side (join or host), written to the fee model in config/policies.ts – the numbers come from there.
import { BOOKING_WINDOW_HOURS } from "@/lib/joinFlow";
import { FEE_MODEL } from "./policies";

export interface FaqItem {
  question: string;
  answer: string;
}

const percent = `${FEE_MODEL.serviceFeePercent} %`;

export const FAQ: Record<"join" | "host", readonly FaqItem[]> = {
  join: [
    { question: "What do I pay?", answer: `Your equal share of the place, plus a ${percent} service fee. You see the full price before you pay.` },
    { question: "When do I pay?", answer: "Only once the crew is complete and the place is chosen. Until then, nothing is charged." },
    { question: "Can I change my mind?", answer: "Until the crew is complete you can withdraw any time, for free. After paying, you can hand your spot to the next person on the waitlist." },
    { question: "Who will I live with?", answer: "You see everyone who's already in – their profiles and the host – before you ask to join." },
    { question: "What if the host doesn't book?", answer: `If the host doesn't confirm the booking within ${BOOKING_WINDOW_HOURS} hours after everyone paid, you get everything back.` },
  ],
  host: [
    { question: "What does hosting cost?", answer: "Nothing extra. You pay your share of the place like everyone else – there are no fees for hosting." },
    { question: "Do I pay for the place upfront?", answer: "No. The place is only booked once the House is complete and everyone has paid their share." },
    { question: "What if my House doesn't fill up?", answer: "Nothing is booked and nobody pays. You can extend the dates or lower the spots." },
    { question: "Who decides who joins?", answer: "You do. You see every request and accept who fits – nobody's in without your yes." },
    { question: "What does Simpulo charge?", answer: `Guests pay a ${percent} service fee on top of their share, shown before they pay. You receive every guest's full share.` },
  ],
};
