// A person's numbers on their profile (the dark strip) – the one place they're defined. The same for everyone who may see the profile (they
// are counts, never people); the server computes the same later.
//   houses        – completed Houses: over (status "completed", or the last night passed), hosted or lived in as crew
//   livedWith     – unique people from all those Houses (host and crew, everyone once, never the person)
//   countries     – unique countries of those Houses
//   hosted        – Houses they host or hosted (not drafts, not cancelled, no examples)
// Internal only – never shown publicly (no ratings on a profile); kept for matching and the host's own area:
//   wouldLiveAgain – of livedWith, how many chose "with you again" after the House (incoming; the rating after a stay – data point after.*,
//                    planned; the mock: lib/yourPeople.ts liveAgainCount)
//   replyHours    – hosts: the median time to answer a request, in whole hours (at least 1); null without answers
import { medianReplyMinutes } from "@/lib/profilePrivacy";
import { getCrew, isCrewMember, type StoreData } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { liveAgainCount } from "@/lib/yourPeople";

const NOT_HELD: ReadonlySet<Stay["status"]> = new Set(["draft", "draft_unclaimed", "closed"]);

/** A House that took place: over, never a draft or a cancelled one. */
const isCompleted = (stay: Stay, today: string) => !NOT_HELD.has(stay.status) && !stay.isExample && (stay.status === "completed" || (stay.endDate !== "" && stay.endDate < today));

export interface ProfileMetrics {
  houses: number;
  livedWith: number;
  countries: number;
  hosted: number;
  /** Internal (matching) – never on the profile */
  wouldLiveAgain: number;
  /** Internal (the host's own area) – never on the profile */
  replyHours: number | null;
}

/** The Houses someone lived in (completed, host or crew), the latest first – the profile's strip names the last one and the countries. */
export function completedStaysOf(data: StoreData, userId: string, today: string): Stay[] {
  return data.stays.filter((s) => isCompleted(s, today) && isCrewMember(data, s, userId)).toSorted((a, b) => b.endDate.localeCompare(a.endDate));
}

export function profileMetrics(data: StoreData, user: User, today: string): ProfileMetrics {
  const completed = data.stays.filter((s) => isCompleted(s, today) && isCrewMember(data, s, user.id));
  const people = new Set(completed.flatMap((s) => getCrew(data, s).map((u) => u.id)).filter((id) => id !== user.id));
  const minutes = medianReplyMinutes(user);
  return {
    houses: completed.length,
    livedWith: people.size,
    countries: new Set(completed.map((s) => s.location.country).filter(Boolean)).size,
    hosted: data.stays.filter((s) => s.hostId === user.id && !NOT_HELD.has(s.status) && !s.isExample).length,
    wouldLiveAgain: liveAgainCount(user.id, [...people]),
    replyHours: minutes === null ? null : Math.max(1, Math.round(minutes / 60)),
  };
}

/** The House someone is in right now (hosting or in its crew) – "Now in {place}" comes only from this, never from a field. */
export function currentHouseOf(data: StoreData, userId: string, today: string): Stay | undefined {
  return data.stays.find((s) => !NOT_HELD.has(s.status) && !s.isExample && s.startDate !== "" && s.startDate <= today && (s.endDate === "" || s.endDate >= today) && isCrewMember(data, s, userId));
}
