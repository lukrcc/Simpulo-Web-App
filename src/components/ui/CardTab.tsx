import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import type { User } from "@/lib/types";
import { cn, firstName } from "@/lib/utils";
import { PersonPhoto } from "./PersonPhoto";

interface CardTabProps {
  host: Pick<User, "id" | "name" | "photos" | "verified">;
  /** Must match what's behind the card, so the tab reads as cut out of it. */
  bg?: string;
  /** Optional extra after the name, e.g. dates on featured cards */
  suffix?: string;
  className?: string;
  /** Classes for the avatar + name, e.g. to fade them in while the tab background stays put */
  contentClassName?: string;
  /** Makes avatar + name a link to the host's profile (cards are links themselves, so off by default). */
  linked?: boolean;
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
export function CardTab({ host, bg = "var(--color-page)", suffix, className, contentClassName, linked = false }: CardTabProps) {
  const t = useTranslations("common.ui.cardTab");
  const content = (
    <span className={cn("flex items-center gap-2", contentClassName)}>
      <PersonPhoto src={host.photos[0]} alt={host.name} size={28} className="size-7" />
      <span className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-ink">
        <span>
          {firstName(host)}
          <span className="text-accent">.</span>
        </span>
        {host.verified && <BadgeCheck className="size-4 shrink-0 text-zinc-500" />}
        {suffix && <span className="font-normal text-zinc-500">· {suffix}</span>}
      </span>
    </span>
  );

  return (
    <div
      aria-hidden={!linked}
      style={{ "--tab-bg": bg, backgroundColor: bg } as CSSProperties}
      className={cn(
        "pointer-events-none absolute left-0 top-0 z-10 flex h-10 items-center rounded-br-[20px] py-1.5 pl-1.5 pr-3.5",
        cornerRight,
        cornerBelow,
        className,
      )}
    >
      {linked ? (
        <Link href={`/u/${host.id}`} aria-label={t("profile", { name: host.name })} className="pointer-events-auto rounded-full hover:opacity-80">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
