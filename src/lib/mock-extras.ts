// App-side mock helpers that aren't part of the data contract in ./mock.ts.
import type { PaymentStatus, Stay } from "./types";

export const crewThreadId = (stayId: string) => `t-${stayId}`;

export interface LinkPreview {
  title: string;
  imageUrl: string;
  domain: string;
}

const mockLinkPreviewTitles: Record<string, string> = {
  "https://www.airbnb.com/rooms/example-canggu-villa": "Villa Sawah · 5BR pool villa near Batu Bolong",
  "https://www.booking.com/example-rawai-house": "Rawai Fight House · 4 rooms, 5 min to Tiger",
  "https://www.airbnb.com/rooms/example-danang-house": "Beach house with pool on An Thuong",
  "https://www.airbnb.com/rooms/example-ericeira": "Surf flat above Ribeira d'Ilhas",
  "https://www.airbnb.com/rooms/example-roma-norte": "Roma Norte loft with a chef's kitchen",
  "https://www.airbnb.com/rooms/example-floripa": "Campeche beach house · 5 rooms, 10 min to the mats",
  "https://www.airbnb.com/rooms/example-thonglor": "Thonglor high-rise · gym in the building",
  "https://www.booking.com/example-innsbruck": "Chalet Nordkette with sauna",
};

/** Mock link unfurl – a real implementation would fetch Open Graph data server-side. */
export function mockLinkPreview(stay: Stay): LinkPreview | null {
  const link = stay.accommodationLink;
  if (!link) return null;
  let domain = link;
  try {
    domain = new URL(link).hostname.replace(/^www\./, "");
  } catch {
    // Not a valid URL – show it as is.
  }
  return {
    title: mockLinkPreviewTitles[link] ?? stay.title,
    imageUrl: `https://picsum.photos/seed/place-${stay.id}/1200/800`,
    domain,
  };
}

/** Mock payment state per stay and user – there's no payment backend yet. */
const mockPaidUsers: Record<string, string[]> = {
  s1: ["u1", "u4"],
  s3: ["u3"],
  s7: ["u7"],
};

export function mockPaymentStatus(stayId: string, userId: string): PaymentStatus {
  return mockPaidUsers[stayId]?.includes(userId) ? "paid" : "pending";
}

/** When the current user last read each thread. Older than the last message = unread. */
export const mockLastReadAt: Record<string, string> = {
  "t-s1": "2026-10-18T14:32:00Z",
};
