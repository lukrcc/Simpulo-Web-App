// Mock "I'm in for …" signals: fixed per person (by index), pointed at the places and months of open Houses, so Open a House, the invite
// sheet and profiles have something to show. The dev user (u1) starts without any.
import { cityPlaceIdOf } from "./data/places";
import type { InFor, InForLength } from "./inFor";
import type { Stay, User } from "./types";

const SEEDED_AT = "2026-10-20T09:00:00.000Z";

const nextMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

function lengthOf(stay: Stay): InForLength {
  const nights = Math.round((Date.parse(stay.endDate) - Date.parse(stay.startDate)) / 86_400_000);
  return nights <= 5 ? "short" : nights <= 40 ? "month" : "long";
}

export function mockInFor(stays: readonly Stay[], users: readonly User[]): InFor[] {
  const open = stays.filter((s) => (s.status === "published" || s.status === "booked") && cityPlaceIdOf(s.city));
  if (open.length === 0) return [];
  return users.flatMap((user, i) => {
    if (user.id === "u1" || i % 2 === 1) return [];
    const picks = i % 5 === 0 ? [open[(i * 7) % open.length], open[(i * 11 + 3) % open.length]] : [open[(i * 7) % open.length]];
    return picks
      .filter((stay, k) => stay.hostId !== user.id && picks.findIndex((p) => p.id === stay.id) === k)
      .map((stay, k): InFor => {
        const from = stay.startDate.slice(0, 7);
        return {
          id: `in-${user.id}-${k}`,
          userId: user.id,
          placeId: cityPlaceIdOf(stay.city)!,
          monthFrom: from,
          monthTo: i % 3 === 0 ? nextMonth(from) : from,
          length: lengthOf(stay),
          categories: i % 4 === 0 ? [stay.vibe] : [],
          createdAt: SEEDED_AT,
        };
      });
  });
}
