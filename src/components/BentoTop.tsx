"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlaceCard } from "@/components/SpotlightHero";
import { AvatarStack } from "@/components/ui/Avatar";
import { CardTab } from "@/components/ui/CardTab";
import { Img } from "@/components/ui/Img";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePageHidden } from "@/lib/usePageHidden";
import { cn, firstName, firstSentence, formatShortRange, placeLabel } from "@/lib/utils";

const CYCLE_MS = 10_000;
const CELL_COUNT = 3;

/** Each cell shows `current`; `previous` stays underneath while `current` fades in, which makes it a crossfade. */
interface CellState {
  current: number;
  previous: number | null;
}

interface Rotation {
  cells: CellState[];
  /** Which cell changes next (A → B → C → A …) */
  step: number;
  /** Where to look for the next featured house to bring in */
  pointer: number;
}

function initialRotation(count: number): Rotation {
  const cells = Array.from({ length: Math.min(CELL_COUNT, count) }, (_, i) => ({ current: i, previous: null }));
  return { cells, step: 0, pointer: cells.length };
}

/** Swap one cell to the next featured house that isn't on screen. Pure, so it's safe as a state updater. */
function rotate(rotation: Rotation, count: number): Rotation {
  const { cells, step, pointer } = rotation;
  const shown = new Set(cells.map((c) => c.current));
  let next = pointer % count;
  while (shown.has(next)) next = (next + 1) % count;
  const cellIndex = step % cells.length;
  return {
    cells: cells.map((cell, i) => (i === cellIndex ? { current: next, previous: cell.current } : cell)),
    step: step + 1,
    pointer: next + 1,
  };
}

const CELL_LAYOUT = [
  "col-span-7 row-span-2", // A
  "col-span-5 col-start-8 row-start-1", // B
  "col-span-5 col-start-8 row-start-2", // C
] as const;

/** Desktop (≥ lg) top section: one large and two small featured Houses that slowly rotate. */
export function BentoTop({ stays }: { stays: Stay[] }) {
  const store = useStore();
  const items = stays.flatMap((stay) => {
    const host = findUser(store, stay.hostId);
    const guests = getCrew(store, stay).filter((u) => u.id !== stay.hostId);
    return host ? [{ stay, host, guests }] : [];
  });
  const count = items.length;

  const [rotation, setRotation] = useState(() => initialRotation(count));
  const [hovered, setHovered] = useState(false);
  const pageHidden = usePageHidden();

  // Only rotate when there are more featured Houses than cells.
  useEffect(() => {
    if (hovered || pageHidden || count <= CELL_COUNT) return;
    const timer = setInterval(() => setRotation((r) => rotate(r, count)), CYCLE_MS);
    return () => clearInterval(timer);
  }, [hovered, pageHidden, count]);

  if (count === 0) return null;

  return (
    <section
      aria-label="Featured Houses"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="mx-auto hidden h-[70vh] min-h-[560px] max-w-[1600px] grid-cols-12 grid-rows-2 gap-6 px-8 pt-6 lg:grid"
    >
      {rotation.cells.map((cell, i) => {
        const large = i === 0;
        const previous = cell.previous !== null ? items[cell.previous] : undefined;
        const current = items[cell.current];
        return (
          // rounded-tl-none: the host tab covers that corner (see CardTab).
          <div key={i} className={cn("relative overflow-hidden rounded-[28px] rounded-tl-none bg-ink", CELL_LAYOUT[i])}>
            {previous && (
              <div aria-hidden inert className="absolute inset-0">
                <BentoCell {...previous} large={large} />
              </div>
            )}
            {/* key = house: a new house remounts the layer, which replays the fade-in. */}
            <div key={current.stay.id} className="absolute inset-0 motion-safe:animate-crossfade">
              <BentoCell {...current} large={large} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

interface BentoCellProps {
  stay: Stay;
  host: User;
  guests: User[];
  large: boolean;
}

function BentoCell({ stay, host, guests, large }: BentoCellProps) {
  return (
    <>
      <Img
        src={host.photos[0]}
        alt=""
        fill
        sizes={large ? "(min-width: 1600px) 900px, 58vw" : "(min-width: 1600px) 640px, 42vw"}
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 to-transparent to-60%" />

      {/* Whole cell is the link; the map card sits above it as a sibling (no <a> inside <a>). */}
      <Link
        href={`/stays/${stay.slug}`}
        aria-label={`${stay.title} with ${firstName(host)}`}
        className="absolute inset-0 cursor-pointer"
      />

      <CardTab host={host} />

      <div className="pointer-events-none absolute inset-x-8 bottom-8 flex items-end justify-between gap-6 text-white">
        <div className="min-w-0">
          <h2 className={cn("font-bold tracking-tight", large ? "line-clamp-2 text-5xl" : "line-clamp-1 text-2xl")}>
            {stay.title}
          </h2>
          {large && <p className="mt-3 line-clamp-2 max-w-xl text-lg text-white/90">{firstSentence(stay.lookingForText)}</p>}
          <p className={cn("text-sm text-white/80", large ? "mt-3" : "mt-1")}>
            {formatShortRange(stay.startDate, stay.endDate)} · {large ? placeLabel(stay) : stay.city}
          </p>
          {large && (
            <div className="mt-4 flex items-center gap-2">
              {guests.length > 0 && <AvatarStack users={guests} size="sm" max={4} />}
              <span className="text-sm font-medium text-white/90">
                {stay.spotsFilled} of {stay.spotsTotal} in
              </span>
            </div>
          )}
        </div>
        {large && <PlaceCard stay={stay} className="pointer-events-auto shrink-0" />}
      </div>
    </>
  );
}
