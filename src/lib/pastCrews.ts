"use client";

// What past crews left for everyone (CLAUDE.md "Danach"): a host's Houses' ratings as averages – only from PUBLIC_RATINGS_MIN ratings, never
// one person's –, the tips people ticked "Show this tip publicly" and the 30-day stories shared with consent. The sentences for the host stay
// private (hostRatings). One place for the House page, the host's profile, Manage and Earnings; the same rules on the server once there is one.
import { PUBLIC_RATINGS_MIN } from "@/config/arc";
import { afterAt, afterRows, summarizeRatings, thirtyAt } from "./arc";
import { getCrew, settingsOf, type StoreData } from "./store";
import type { Stay, User } from "./types";

type Clock = (stay: Stay) => number;

/** The Houses a host hosted that have had their day after (by each House's clock – the Dev menu's House day). */
function pastHousesOf(data: StoreData, hostId: string, clock: Clock): Stay[] {
  return data.stays.filter((s) => s.hostId === hostId && !s.isExample && s.status !== "draft" && s.status !== "closed" && clock(s) >= afterAt(s));
}

export interface PastTip {
  text: string;
  house: Stay;
}
export interface PastStory {
  text: string;
  user: User;
  house: Stay;
}

/** Public: a host's ratings (averages, shown only from PUBLIC_RATINGS_MIN), the public tips and the shared stories, newest House first. */
export function pastCrewsOf(data: StoreData, hostId: string, clock: Clock) {
  const houses = pastHousesOf(data, hostId, clock).toSorted((a, b) => b.endDate.localeCompare(a.endDate));
  const ratings = summarizeRatings(houses.flatMap((s) => afterRows(data, s, clock(s))));
  const tips: PastTip[] = [];
  const stories: PastStory[] = [];
  for (const house of houses) {
    for (const u of getCrew(data, house).filter((x) => x.id !== hostId)) {
      const after = settingsOf(u).after?.[house.id];
      if (after?.tip && after.tipPublic) tips.push({ text: after.tip, house });
      const thirty = settingsOf(u).thirty?.[house.id];
      if (thirty?.story && thirty.still && clock(house) >= thirtyAt(house)) stories.push({ text: thirty.still, user: u, house });
    }
  }
  const shown = ratings.count >= PUBLIC_RATINGS_MIN;
  return { count: ratings.count, averages: shown ? ratings.averages : null, tips, stories, any: shown || tips.length > 0 || stories.length > 0 };
}

/** For the host only (Manage, Earnings): all their ratings and the private sentences, without names. */
export function hostRatings(data: StoreData, hostId: string, clock: Clock) {
  return summarizeRatings(pastHousesOf(data, hostId, clock).flatMap((s) => afterRows(data, s, clock(s))));
}
