"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type MouseEvent } from "react";
import { InviteSheet } from "@/components/InviteSheet";
import { Avatar } from "@/components/ui/Avatar";
import { useCrewFaceOf } from "@/components/ui/useCrewFaces";
import { useCanInvite } from "@/lib/invites";
import type { Stay, User } from "@/lib/types";
import { cn, firstName, openSpots } from "@/lib/utils";

type Size = "xs" | "md" | "lg";
const CIRCLE: Record<Size, string> = { xs: "size-6", md: "size-10", lg: "size-14" };
const PLUS: Record<Size, string> = { xs: "size-3", md: "size-4", lg: "size-5" };
const TONE = {
  /** On the page and light panels: ink 25 %; the host's dot ink on a light ring */
  light: { edge: "border-ink/25", plus: "text-ink/55", hover: "hover:bg-ink/5", name: "text-ink", muted: "text-muted", dot: "bg-ink ring-(--bg)" },
  /** On Ember: cream, the dot cream on an ink ring */
  dark: { edge: "border-[#F4EEE7]/35", plus: "text-[#F4EEE7]/70", hover: "hover:bg-[#F4EEE7]/8", name: "text-[#F4EEE7]", muted: "text-[#F4EEE7]/55", dot: "bg-[#F4EEE7] ring-[#221E1B]" },
  /** On a photo (a card's foot): white */
  image: { edge: "border-white/60", plus: "text-white/85", hover: "hover:bg-white/15", name: "text-white", muted: "text-white/75", dot: "bg-white ring-black/40" },
} as const;
const DOT: Record<Size, string> = { xs: "size-2 ring-[1.5px]", md: "size-2.5 ring-2", lg: "size-3 ring-2" };

/**
 * The crew of a House as one row, the same everywhere: the host counts to the crew and comes first, with a small host dot on the avatar;
 * then the members, then one empty circle per free spot – a dashed edge (ink 25 %; cream on Ember, white on a photo). Only for the host and
 * members (useCanInvite: a free spot, not started) the circles carry "+" and open the InviteSheet; for visitors they're plain dashed circles,
 * not clickable. A full House: no empty circles. `names`: first names under the faces (the Crew sections).
 */
export function CrewRow({ stay, crew, size = "md", tone = "light", names = false, max = 8, hiddenCount = 0, interactive = true, className }: { stay: Stay; crew: User[]; size?: Size; tone?: keyof typeof TONE; names?: boolean; /** At most this many circles in all */ max?: number; /** Members not shown (privacy): a "+N" before the free circles */ hiddenCount?: number; /** false: the circles only show (another invite entry is in the same block) */ interactive?: boolean; className?: string }) {
  const t = useTranslations("invite");
  const faceOf = useCrewFaceOf(stay);
  const can = useCanInvite(stay.id) && interactive;
  const [open, setOpen] = useState(false);
  const shown = crew.toSorted((a, b) => Number(b.id === stay.hostId) - Number(a.id === stay.hostId)).slice(0, max);
  const free = Math.max(0, Math.min(openSpots(stay), stay.spotsTotal - crew.length - hiddenCount, max - shown.length));
  const colors = TONE[tone];
  const avatarSize = size === "xs" ? "xs" : size === "md" ? "md" : "lg";
  const invite = (e: MouseEvent) => {
    // Inside a card's link: the circle opens the sheet, not the House.
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };
  const circle = (i: number) => {
    // "+" only where you can invite here; for visitors (and beside another invite entry in the same block) an empty dashed circle.
    const body = can ? <Plus aria-hidden className={cn(PLUS[size], colors.plus)} strokeWidth={2} /> : null;
    const style = cn("flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed", CIRCLE[size], colors.edge);
    return can ? (
      <button key={`free-${i}`} type="button" onClick={invite} aria-label={t("addSpot")} className={cn(style, "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-(--focus-ring)", colors.hover)}>
        {body}
      </button>
    ) : (
      <span key={`free-${i}`} aria-hidden className={style}>
        {body}
      </span>
    );
  };

  return (
    <>
      <ul className={cn("flex flex-wrap items-start", names ? "gap-4" : size === "xs" ? "-space-x-1" : "gap-1.5", className)}>
        {shown.map((member) => (
          <li key={member.id} className={cn(names && "flex w-14 flex-col items-center gap-1.5")}>
            <span className="relative inline-flex">
              <Avatar user={member} size={avatarSize} mode={faceOf(member)} linked={!names ? false : faceOf(member) === "full"} className={size === "xs" ? "ring-1 ring-black/20" : undefined} />
              {member.id === stay.hostId && (
                <span role="img" aria-label={t("hostDot")} className={cn("absolute -bottom-0.5 -right-0.5 rounded-full", DOT[size], colors.dot)} />
              )}
            </span>
            {names && <span className={cn("max-w-full truncate text-small font-semibold", colors.name)}>{faceOf(member) === "full" ? firstName(member) : ""}</span>}
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className={cn(names && "flex w-14 flex-col items-center gap-1.5")}>
            <span className={cn("flex items-center justify-center rounded-full bg-(--chip-bg) text-small font-semibold text-ink", CIRCLE[size])}>+{hiddenCount}</span>
          </li>
        )}
        {Array.from({ length: free }, (_, i) => (
          <li key={`free-${i}`} className={cn(names && "flex w-14 flex-col items-center gap-1.5", size === "xs" && "ml-1")}>
            {circle(i)}
            {names && <span className={cn("text-small", colors.muted)}>{can ? t("invite") : t("freeSpot")}</span>}
          </li>
        ))}
      </ul>
      {/* React events bubble out of the portal: inside a card's link they must stop here. */}
      {can && (
        <span className="contents" onClick={(e) => e.stopPropagation()}>
          <InviteSheet stay={stay} open={open} onClose={() => setOpen(false)} />
        </span>
      )}
    </>
  );
}

/**
 * The crew's one line, the same everywhere: "2 of 6 in · 4 spots left"; one spot free: "5 of 6 in · 1 spot left" with that part orange;
 * none: "Full". The host counts to "in" (spotsFilled).
 */
export function CrewCount({ stay, className }: { stay: Stay; className?: string }) {
  const t = useTranslations("invite");
  const left = openSpots(stay);
  if (left === 0) return <p className={cn("text-small font-semibold text-ink", className)}>{t("full")}</p>;
  return (
    <p className={cn("text-small text-ink", className)}>
      {t("crewIn", { in: stay.spotsFilled, total: stay.spotsTotal })}
      {" · "}
      <span className={cn(left === 1 && "font-semibold text-accent")}>{t("spotsLeft", { count: left })}</span>
    </p>
  );
}
