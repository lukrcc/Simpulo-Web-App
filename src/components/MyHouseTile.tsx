"use client";

import { Camera } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MouseEventHandler, ReactNode } from "react";
import { CardStatusChip } from "@/components/HouseCard";
import { cardTextShadow } from "@/components/ui/glass";
import { Img } from "@/components/ui/Img";
import { useFormat } from "@/i18n/format";
import { placeShortOf } from "@/lib/shortName";
import { findUser, useStore } from "@/lib/store";
import type { Stay } from "@/lib/types";
import { cn, housePhotos } from "@/lib/utils";

/** Image sizes of a tile: four a row from 1100px, two and a bit on tablets, 85 % on phones (globals.css .my-slide). */
const TILE_SIZES = "(min-width: 1100px) 25vw, (min-width: 744px) 45vw, 85vw";

/**
 * Your houses' ONE card (CLAUDE.md "Your houses – Reihen statt Reiter"): every row – Going · Waiting · Hosting · Your places · Lived in · Saved –
 * the same tile, no host tab and no notch (those stay Explore's). The picture 4:3, rounded (16); top left the status label in dark glass
 * (`label`, a small orange dot when something asks for you – `attention`); at the bottom of the picture on a light gradient the title (one
 * line) and `sub` ("date · place"); nothing under the picture. `labelAction`: the label is its own button (Lived in "Do it again").
 * `menu`: top right ("…" of a draft); `hoverAction`: top right on hover, always on touch (Your places "Open a window").
 */
export function PhotoTile({
  href,
  photo,
  title,
  sub,
  label,
  attention = false,
  labelAction,
  menu,
  hoverAction,
  onClickCapture,
}: {
  href: string;
  photo?: string;
  title: string;
  sub?: string;
  label?: ReactNode;
  attention?: boolean;
  labelAction?: () => void;
  menu?: ReactNode;
  hoverAction?: ReactNode;
  onClickCapture?: MouseEventHandler;
}) {
  return (
    <div className="group relative min-w-0" onClickCapture={onClickCapture}>
      <Link href={href} className="relative block aspect-4/3 overflow-hidden rounded-2xl bg-linear-to-br from-(--card-blank-from) to-(--card-blank-to) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
        {photo ? (
          <Img src={photo} alt="" fill sizes={TILE_SIZES} className="object-cover transition-transform duration-350 group-hover:scale-[1.03] motion-reduce:transition-none" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-ink/30">
            <Camera aria-hidden className="size-8" />
          </span>
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-shade/60 via-shade/25 to-transparent" />
        <span className={cn("absolute inset-x-0 bottom-0 flex flex-col px-4 pb-3.5", cardTextShadow)}>
          <span className="truncate text-body-lg font-semibold text-on-image">{title}</span>
          {sub && <span className="truncate text-small text-on-image/85">{sub}</span>}
        </span>
      </Link>
      {label && (
        <span className="absolute left-3 top-3 z-10 max-w-[calc(100%-24px)]">
          {labelAction ? (
            <button type="button" onClick={labelAction} className="press rounded-full focus-visible:outline-2 focus-visible:outline-(--focus-ring)">
              <CardStatusChip attention={attention}>{label}</CardStatusChip>
            </button>
          ) : (
            <span className="pointer-events-none">
              <CardStatusChip attention={attention}>{label}</CardStatusChip>
            </span>
          )}
        </span>
      )}
      {menu && <div className="absolute right-2 top-2 z-10">{menu}</div>}
      {hoverAction && <div className="absolute right-3 top-3 z-10 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">{hoverAction}</div>}
    </div>
  );
}

/** A House as the tile: its first photo, its title, "date · place" (Place.short – "Madeira", never the House's short name). */
export function MyHouseTile({ stay, ...rest }: { stay: Stay } & Omit<Parameters<typeof PhotoTile>[0], "photo" | "title" | "sub">) {
  const tHome = useTranslations("houses.home");
  const format = useFormat();
  const store = useStore();
  const photo = housePhotos(stay, findUser(store, stay.hostId))[0];
  const sub = [stay.startDate ? format.stayDates(stay) : "", placeShortOf(stay)].filter(Boolean).join(" · ");
  return <PhotoTile {...rest} photo={photo} title={stay.title || tHome("untitled")} sub={sub} />;
}
