"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/ActionButton";
import { ChipCheck } from "@/components/ui/Chip";
import { RowHead } from "@/components/ui/CardRow";
import { useFormat } from "@/i18n/format";
import { openVote, votesFor, voteOutcome } from "@/lib/crewVotes";
import { linkDomain } from "@/lib/links";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { CrewVote, Stay, VoteKind, VoteOption } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";

const noSubscribe = () => () => {};
const todayIso = () => new Date().toISOString().slice(0, 10);

/** "Decide with crew", on the House page and pinned over the crew chat: what's still being voted on. */
export function CrewVotes({ stay, pinned = false }: { stay: Stay; pinned?: boolean }) {
  const kinds = (["accommodation", "dates"] as const).filter((kind) => openVote(stay, kind));
  if (kinds.length === 0) return null;
  if (pinned) {
    return (
      <div className="max-h-[40vh] shrink-0 space-y-6 overflow-y-auto overscroll-contain bg-surface p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        {kinds.map((kind) => (
          <Vote key={kind} stay={stay} kind={kind} vote={openVote(stay, kind)!} />
        ))}
      </div>
    );
  }
  return (
    <>
      {kinds.map((kind) => (
        <Vote key={kind} stay={stay} kind={kind} vote={openVote(stay, kind)!} />
      ))}
    </>
  );
}

function Vote({ stay, kind, vote }: { stay: Stay; kind: VoteKind; vote: CrewVote }) {
  const t = useTranslations("house.page");
  const format = useFormat();
  const store = useStore();
  const { currentUserId, decideVote } = store;
  const today = useSyncExternalStore(noSubscribe, todayIso, () => "");
  const memberIds = getCrew(store, stay).map((u) => u.id);
  const member = currentUserId !== null && currentUserId !== undefined && memberIds.includes(currentUserId);
  const isHost = currentUserId === stay.hostId;
  const outcome = voteOutcome(vote, { memberIds, crewComplete: stay.spotsFilled >= stay.spotsTotal, today });
  const total = vote.options.reduce((sum, o) => sum + votesFor(o.voterIds, memberIds), 0);
  const host = findUser(store, stay.hostId);

  // A clear winner stands as soon as the vote has ended. (With a backend the server does this at the deadline.)
  const winner = outcome.state === "won" ? outcome.optionId : null;
  useEffect(() => {
    if (winner && member) decideVote(stay.id, kind, winner);
  }, [winner, member, decideVote, stay.id, kind]);

  const labelOf = (option: VoteOption) => (kind === "dates" ? format.shortRange(option.startDate ?? "", option.endDate ?? "") : linkDomain(option.link ?? ""));
  const tied = outcome.state === "tie" ? outcome.optionIds : [];

  return (
    <section aria-labelledby={`house-vote-${kind}`}>
      <RowHead
        id={`house-vote-${kind}`}
        title={t(kind === "dates" ? "voteTitleDates" : "voteTitleAccommodation")}
        aside={isHost && outcome.state === "open" ? <Button variant="tertiary" onClick={() => store.closeVote(stay.id, kind)}>{t("voteClose")}</Button> : undefined}
      />
      <ul className="mt-4 max-w-[640px] space-y-4">
        {vote.options.map((option) => {
          const count = votesFor(option.voterIds, memberIds);
          const mine = member && option.voterIds.includes(currentUserId);
          const choosable = isHost && tied.includes(option.id);
          const canVote = member && outcome.state === "open";
          const label = labelOf(option);
          const row = (
            <>
              <span className="flex items-baseline justify-between gap-4">
                <span className="flex min-w-0 items-center gap-1.5 text-body text-ink">
                  {mine && <ChipCheck />}
                  <span className="truncate">{label}</span>
                  {option.pricePerPerson !== undefined && <span className="shrink-0 text-small text-muted">{t("voteOption", { price: format.price(option.pricePerPerson, stay.currency) })}</span>}
                </span>
                <span className="shrink-0 text-small tabular-nums text-muted">{t("votes", { count })}</span>
              </span>
              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-ink/5">
                <span className="block h-full origin-left rounded-full bg-(--stage-peach) transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `scaleX(${total ? count / total : 0})` }} />
              </span>
            </>
          );
          return (
            <li key={option.id} className="flex items-center gap-3">
              {canVote || choosable ? (
                <button
                  type="button"
                  aria-pressed={mine}
                  aria-label={t("voteFor", { option: label ?? "" })}
                  onClick={() => (choosable ? decideVote(stay.id, kind, option.id) : store.castVote(stay.id, kind, option.id))}
                  className={cn("block min-w-0 flex-1 rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ink/25")}
                >
                  {row}
                </button>
              ) : (
                <div className="min-w-0 flex-1">{row}</div>
              )}
              {option.link && (
                <a href={option.link} target="_blank" rel="noopener noreferrer" aria-label={t("voteOpenLink")} className="shrink-0 text-muted hover:text-ink">
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-small text-muted">
        {outcome.state === "tie" ? (isHost ? t("voteTie") : t("voteTieGuest", { name: host ? firstName(host) : "" })) : vote.deadline ? t("voteEnds", { date: format.day(vote.deadline) }) : member ? t("voteHint") : null}
      </p>
    </section>
  );
}
