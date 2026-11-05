import type { CrewVote, Stay, VoteKind } from "./types";

/*
 * "Decide with crew": the crew votes on the host's proposals for the place and for the dates. One vote per member, it can be
 * changed until the vote ends. It ends at its deadline, when the host closes it, or once a complete crew has all voted. The most
 * votes win; on a tie (or no votes at all) the host decides.
 */

export type VoteOutcome = { state: "open" } | { state: "won"; optionId: string } | { state: "tie"; optionIds: string[] };

export const VOTE_FIELD = { accommodation: "accommodationVote", dates: "datesVote" } as const satisfies Record<VoteKind, keyof Stay>;

/** A vote still to be decided – the House page and the crew chat show it. */
export function openVote(stay: Stay, kind: VoteKind): CrewVote | undefined {
  const vote = stay[VOTE_FIELD[kind]];
  if (!vote || vote.decidedOptionId || vote.options.length === 0) return undefined;
  return kind === "accommodation" && stay.accommodationStatus === "locked" ? undefined : vote;
}

/** Votes of people who are (still) in the crew. */
export const votesFor = (voterIds: string[], memberIds: readonly string[]) => voterIds.filter((id) => memberIds.includes(id)).length;

export function voteOutcome(vote: CrewVote, { memberIds, crewComplete, today }: { memberIds: readonly string[]; crewComplete: boolean; today: string }): VoteOutcome {
  const cast = vote.options.reduce((sum, o) => sum + votesFor(o.voterIds, memberIds), 0);
  const ended = Boolean(vote.closedAt) || (Boolean(vote.deadline) && today !== "" && vote.deadline! < today) || (crewComplete && cast >= memberIds.length);
  if (!ended) return { state: "open" };
  const most = Math.max(...vote.options.map((o) => votesFor(o.voterIds, memberIds)));
  const leading = vote.options.filter((o) => votesFor(o.voterIds, memberIds) === most);
  return leading.length === 1 ? { state: "won", optionId: leading[0].id } : { state: "tie", optionIds: leading.map((o) => o.id) };
}

/** Nobody pays before the crew is complete, whichever way the place was chosen. */
export const paymentWaitsForCrew = (stay: Pick<Stay, "spotsFilled" | "spotsTotal">) => stay.spotsFilled < stay.spotsTotal;
