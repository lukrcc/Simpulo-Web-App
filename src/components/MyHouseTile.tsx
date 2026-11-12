"use client";

import { Camera } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MouseEventHandler, ReactNode } from "react";
import { Img } from "@/components/ui/Img";
import { useFormat } from "@/i18n/format";
import { placeShortOf } from "@/lib/shortName";
import { findUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";

/**
 * One of your own Houses (Hosting · Going · Waiting · Lived in · Up next): no notch, no heart, no socials, no text on the photo – that's the
 * HouseCard's, for open Houses you can join. The photo 16:10 (Lived in: 1:1), only the picture rounded (16); under it, on the page: the
 * title (one line, 17px semibold), "date · place" muted (Place.short: "Madeira", never the House's short name), then the status line – no
 * crew faces, no "+" circles: left `meta` (Going/Waiting "in 66 days" or the date; Hosting "2 of 4 in"), right the status ("You're in",
 * "Waiting for host", "Pay · 48h" orange, "● Review 1 request", "Open for requests"). `menu`: top right on the photo.
 */
export function MyHouseTile({
  stay,
  href,
  status,
  meta,
  square = false,
  menu,
  onClickCapture,
}: {
  stay: Stay;
  href: string;
  /** Right in the status line: a muted status, a task (orange dot) or an action ("Do it again") */
  status?: ReactNode;
  /** Left in the status line: "in 66 days", the date, or "2 of 4 in" */
  meta?: ReactNode;
  /** Lived in: the photo 1:1, a smaller tile */
  square?: boolean;
  menu?: ReactNode;
  onClickCapture?: MouseEventHandler;
}) {
  const tHome = useTranslations("houses.home");
  const format = useFormat();
  const store = useStore();
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  return (
    <div className="group relative min-w-0" onClickCapture={onClickCapture}>
      <Link href={href} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
        <span className={cn("relative flex items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) text-ink/30", square ? "aspect-square" : "aspect-16/10")}>
          {photo ? (
            <Img src={photo} alt="" fill sizes={square ? "200px" : "(min-width: 1440px) 270px, (min-width: 1024px) 25vw, 33vw"} className="object-cover transition-transform duration-350 group-hover:scale-[1.03]" />
          ) : (
            <Camera aria-hidden className="size-8" />
          )}
        </span>
        <span className="mt-3 block truncate text-body-lg font-semibold text-ink">{stay.title || tHome("untitled")}</span>
        <span className="block truncate text-small text-muted">
          {stay.startDate ? format.stayDates(stay) : ""}
          {stay.startDate && " · "}
          {placeShortOf(stay)}
        </span>
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        {!square && meta && <span className="shrink-0 text-small tabular-nums text-muted">{meta}</span>}
        {/* The meta never shrinks; a long status ("Review 4 requests") is the one that gets cut. */}
        {status && <span className={cn("flex min-w-0 items-center justify-end overflow-hidden", square && "w-full justify-start")}>{status}</span>}
      </div>
      {menu && <div className="absolute right-2 top-2 z-10">{menu}</div>}
    </div>
  );
}

/** A status without anything to do: muted text; unread news put an orange dot before it. */
export function MyHouseStatus({ children, attention = false }: { children: ReactNode; attention?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-small text-muted">
      {attention && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />}
      {children}
    </span>
  );
}
