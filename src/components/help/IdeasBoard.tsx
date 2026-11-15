"use client";

// The public list of top ideas with voting – prepared, off (config/platform.ts ideasBoard; /ideas is a 404 while it's false). The ideas from
// "Share an idea" (tickets with category "idea"), not merged, not closed, most votes first; planned ones marked. One vote per idea and
// browser (lib/admin/store.ts voteIdea). Before it goes on: consent to show an idea, and the team approves each one (see the flag).
import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { useState } from "react";
import { ideasBoard } from "@/config/platform";
import { Button } from "@/components/ui/ActionButton";
import { useAdminData, voteIdea, votedIdeas } from "@/lib/admin/store";
import { openShareIdea } from "@/lib/support/feedback";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/utils";

/** /ideas: a 404 while the board is off (checked here – config/platform.ts holds client hooks, so the server page doesn't import it). */
export function IdeasBoardPage() {
  if (!ideasBoard) notFound();
  return <IdeasBoard />;
}

function IdeasBoard() {
  const t = useTranslations("ideas");
  const { tickets } = useAdminData();
  const hydrated = useHydrated();
  const [voted, setVoted] = useState<string[]>([]);
  const mine = hydrated ? [...new Set([...votedIdeas(), ...voted])] : [];
  const ideas = tickets
    .filter((ticket) => ticket.category === "idea" && !ticket.mergedInto && ticket.status !== "closed" && ticket.status !== "done")
    .toSorted((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-[720px] px-5 py-16">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-3 text-body-lg text-muted">{t("intro")}</p>
      <Button variant="secondary" className="mt-6" onClick={openShareIdea}>
        {t("share")}
      </Button>
      {ideas.length === 0 ? (
        <p className="mt-10 text-body text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-10 divide-y divide-ink/8 border-y border-ink/8">
          {ideas.map((idea) => {
            const done = mine.includes(idea.id);
            return (
              <li key={idea.id} className="flex items-start gap-4 py-4">
                <button
                  type="button"
                  aria-pressed={done}
                  aria-label={done ? t("voted") : t("vote")}
                  disabled={done}
                  onClick={() => {
                    voteIdea(idea.id);
                    setVoted((list) => [...list, idea.id]);
                  }}
                  className={cn("flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors duration-150", done ? "border-ink bg-ink text-inverse" : "border-ink/12 text-ink hover:bg-ink/5")}
                >
                  <ChevronUp className="size-4" aria-hidden />
                  <span className="text-small font-semibold tabular-nums">{idea.votes}</span>
                </button>
                <div className="min-w-0 pt-1">
                  <p className="text-body text-ink">{idea.message.split("\n")[0]}</p>
                  <p className="mt-1 text-small text-muted">
                    {t("votes", { count: idea.votes })}
                    {idea.status === "planned" && <span className="font-semibold text-ink"> · {t("planned")}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
