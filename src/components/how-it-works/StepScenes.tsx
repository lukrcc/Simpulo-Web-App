"use client";

import { Link2, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { HouseCard } from "@/components/HouseCard";
import { chipStyles } from "@/components/ui/Chip";
import { PersonPhoto } from "@/components/ui/PersonPhoto";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Role = "join" | "host";

/** The mini card: the real HouseCard at 360px, scaled to 40 % (144 × 180px) – fits the 220px scene with 20px above and below. */
const CARD_W = 360;
const CARD_SCALE = 0.4;

/**
 * A small scene above each step, built from the real pieces in miniature (HouseCard, the chat bubble, avatars, chips). Both roles are
 * stacked in the same place and cross-fade (200ms) when "join · host" switches; nothing in them can be clicked.
 */
export function StepScene({ step, role, stays }: { step: 0 | 1 | 2; role: Role; stays: Stay[] }) {
  return (
    <div aria-hidden inert className="card-soft pointer-events-none relative grid h-[220px] select-none overflow-hidden rounded-3xl">
      {(["join", "host"] as const).map((r) => (
        <div
          key={r}
          data-scene={`${r}-${step + 1}`}
          className={cn(
            "flex items-center justify-center p-6 transition-opacity duration-200 ease-out [grid-area:1/1] motion-reduce:transition-none",
            r === role ? "opacity-100" : "opacity-0",
          )}
        >
          <SceneBody step={step} role={r} active={r === role} stays={stays} />
        </div>
      ))}
    </div>
  );
}

function SceneBody({ step, role, active, stays }: { step: 0 | 1 | 2; role: Role; active: boolean; stays: Stay[] }) {
  const t = useTranslations("howItWorks");
  const store = useStore();
  const stay = stays[role === "join" ? 0 : 1] ?? stays[0];
  if (!stay) return null;
  const host = findUser(store, stay.hostId);
  const people = [host, ...getCrew(store, stay).filter((u) => u.id !== host?.id), ...store.users.filter((u) => u.photos[0] && u.id !== host?.id)].filter((u): u is User => !!u).slice(0, 4);

  if (step === 0) {
    // Join: a House to find. Host: your own, just opened – "You" in the tab, 1 of 4.
    const shown = role === "host" ? { ...stay, spotsTotal: 4, spotsFilled: 1 } : stay;
    return (
      <MiniCard>
        <HouseCard stay={shown} host={host} crew={role === "host" ? people.slice(0, 1) : getCrew(store, stay)} notch={role === "host" ? "you" : "host"} footer={role === "host" ? "status" : "explore"} preview />
      </MiniCard>
    );
  }
  if (step === 1 && role === "join") {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="flex items-end gap-2">
          {people[1] && <PersonPhoto src={people[1].photos[0]} alt="" size={32} className="size-8 rounded-full" />}
          <p className="rounded-[20px] rounded-bl-md bg-[#FDFCFA] px-4 py-2.5 text-body text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)]">{t("sceneAsk")}</p>
        </div>
        <Pill className="ml-10">{t("sceneAccepted")}</Pill>
      </div>
    );
  }
  if (step === 1) {
    return (
      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FDFCFA] pl-4 pr-3 text-body text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(40,32,26,0.06)]">
        <Link2 className="size-4 text-muted" />
        {t("sceneLink")}
        <span className="ml-1 flex size-8 items-center justify-center rounded-full bg-ink/6">
          <Share className="size-4" />
        </span>
      </span>
    );
  }
  // Step 3: the crew is complete – paid (join) or booked (host). On host the avatars arrive one by one when the scene comes in.
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex -space-x-3">
        {people.map((person, i) => (
          <span
            key={person.id}
            className={cn(
              "block transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              role === "host" && !active && i > 0 && "translate-x-3 opacity-0",
            )}
            style={{ transitionDelay: role === "host" && active ? `${i * 60}ms` : "0ms" }}
          >
            <PersonPhoto src={person.photos[0]} alt="" size={48} className="size-12 rounded-full border-[3px] border-[#FBFAF7]" />
          </span>
        ))}
      </div>
      <p className="text-small font-semibold text-ink">{t("sceneFull", { filled: 4, total: 4 })}</p>
      <Pill>{role === "join" ? t("scenePaid") : t("sceneBooked")}</Pill>
    </div>
  );
}

function MiniCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative shrink-0" style={{ width: CARD_W * CARD_SCALE, height: (CARD_W * 5 * CARD_SCALE) / 4 }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: CARD_W, transform: `scale(${CARD_SCALE})` }}>
        {children}
      </div>
    </div>
  );
}

/** A status chip: the selected capsule look, not a button. */
function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(chipStyles(true, { size: "sm" }), "pointer-events-none", className)}>{children}</span>;
}

