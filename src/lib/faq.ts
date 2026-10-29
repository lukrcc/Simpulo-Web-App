// FAQ content: one list, used by /faq (sections + FAQPage JSON-LD). TODO: final copy – these are first drafts.

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ: readonly FaqSection[] = [
  {
    id: "basics",
    title: "The basics",
    items: [
      {
        question: "What is Simpulo?",
        answer: "Simpulo is where people open a House – a shared place for a few weeks – and find the right people to live there with.",
      },
      {
        question: "What is a House?",
        answer: "A House is a trip with a host: a place, dates, a few open spots and a vibe – from founder weeks to surf houses.",
      },
      {
        question: "Is Simpulo free?",
        answer: "Opening a House and sending requests is free. When the place is booked, guests pay their share plus a small Simpulo fee.",
      },
    ],
  },
  {
    id: "joining",
    title: "Joining a House",
    items: [
      {
        question: "How do I join a House?",
        answer: "Open the House, tell the host a bit about yourself and send a request. The host accepts the people who fit.",
      },
      {
        question: "When do I pay?",
        answer: "Only when the host has locked the place and you are part of the crew. Until then, nothing is charged.",
      },
    ],
  },
  {
    id: "hosting",
    title: "Hosting",
    items: [
      {
        question: "How do I open a House?",
        answer: "Pick a place, dates and the number of spots, say who you're looking for – and share the link.",
      },
      {
        question: "Can I charge for a host experience?",
        answer: "Pro hosts can add a host experience – coaching, guestlists, hosted dinners – of up to 30 % of the share.",
      },
    ],
  },
  {
    id: "safety",
    title: "Safety",
    items: [
      {
        question: "How do I know who I'm living with?",
        answer: "Every profile shows a face, languages and links; verified people carry a badge. You see the crew before you join.",
      },
      {
        question: "What if something goes wrong?",
        answer: "Report a person or House from its page – our team reviews every report.",
      },
    ],
  },
];
