import { BadgeCheck } from "lucide-react";
import type { CSSProperties } from "react";
import type { User } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { Img } from "./Img";

interface CardTabProps {
  host: Pick<User, "name" | "photos" | "verified">;
  /** Must match what's behind the card, so the tab reads as cut out of it. */
  bg?: string;
  /** Optional extra after the name, e.g. dates on featured cards */
  suffix?: string;
  className?: string;
}

// Inverted corners: page colour everywhere except a 20px quarter circle at the bottom-right, which lets the
// card show through – a continuous concave curve next to the tab. Written out twice because Tailwind only
// generates classes it can find literally in the source.
const cornerRight =
  "before:absolute before:left-full before:top-0 before:size-5 before:content-[''] before:bg-[radial-gradient(circle_at_100%_100%,transparent_19.5px,var(--tab-bg)_20px)]";
const cornerBelow =
  "after:absolute after:left-0 after:top-full after:size-5 after:content-[''] after:bg-[radial-gradient(circle_at_100%_100%,transparent_19.5px,var(--tab-bg)_20px)]";

/**
 * Notched host tab for the top-left corner of a card (the card needs `relative overflow-hidden`).
 * The tab itself plus two inverted corners – right of it along the top edge, below it along the left edge.
 */
export function CardTab({ host, bg = "#ffffff", suffix, className }: CardTabProps) {
  return (
    <div
      aria-hidden
      style={{ "--tab-bg": bg, backgroundColor: bg } as CSSProperties}
      className={cn(
        "pointer-events-none absolute left-0 top-0 z-10 flex h-10 items-center gap-2 rounded-br-[20px] py-1.5 pl-1.5 pr-3.5",
        cornerRight,
        cornerBelow,
        className,
      )}
    >
      <Img src={host.photos[0]} alt="" width={28} height={28} className="size-7 shrink-0 rounded-full object-cover" />
      <span className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-ink">
        <span>
          {firstName(host)}
          <span className="text-accent">.</span>
        </span>
        {host.verified && <BadgeCheck className="size-4 shrink-0 text-zinc-500" />}
        {suffix && <span className="font-normal text-zinc-500">· {suffix}</span>}
      </span>
    </div>
  );
}
